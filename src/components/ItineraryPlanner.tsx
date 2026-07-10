import { useState, useMemo, useEffect, useRef } from 'react'
import { GPXWaypoint, TrailMarker, waypointsToMarkers } from '../utils/gpxParser'
import { Campsite, getAllCampsites, SelectedCampsite } from '../utils/campsites'
import { formatPlanTemplate } from '../utils/planTemplate'
import { PlannerState } from '../utils/planState'
import { computeDistanceBalancedSplits } from '../utils/splitRoute'
import { toZhHans } from '../utils/toZhHans'
import ElevationChart from './ElevationChart'

const MAX_DAYS = 10

export interface DayPath {
  day: number
  positions: Array<[number, number]>
  color: string
  markers: TrailMarker[]
}

interface ItineraryPlannerProps {
  gpxWaypoints?: GPXWaypoint[]
  gpxTrack?: Array<[number, number]>
  trackElevations?: number[] // 与 gpxTrack 顺序对齐的逐点海拔
  trailName?: string
  trailNameEn?: string
  initialPlan?: PlannerState | null
  onPlanChange?: (state: PlannerState) => void
  onPathsChange?: (paths: DayPath[]) => void
  onCampsitesChange?: (campsites: SelectedCampsite[]) => void
  onFocusCampsite?: (campsiteId: string) => void
  className?: string
}

// 计算累计爬升的阈值（米）：过滤 DEM 噪声，避免高估
const GAIN_THRESHOLD = 5

// 露营点就近筛选：优先展示距当天终点 5km 内的；不足时再取最近的若干个
const CAMP_NEAR_KM = 5
const CAMP_MAX_OPTIONS = 6

function pickNearbyCampsites(
  endMarker: TrailMarker | undefined,
  campsites: Campsite[],
  selCampId?: string
): Array<{ c: Campsite; dist: number }> {
  if (!endMarker || campsites.length === 0) return []

  const withDist = campsites
    .map((c) => ({
      c,
      dist: haversine([endMarker.lat, endMarker.lng], [c.lat, c.lng]),
    }))
    .sort((a, b) => a.dist - b.dist)

  let list = withDist.filter((x) => x.dist <= CAMP_NEAR_KM).slice(0, CAMP_MAX_OPTIONS)
  if (list.length === 0) {
    list = withDist.slice(0, CAMP_MAX_OPTIONS)
  }

  if (selCampId && !list.some((x) => x.c.id === selCampId)) {
    const sel = withDist.find((x) => x.c.id === selCampId)
    if (sel) list.push(sel)
  }

  return list
}

// 将海拔序列下采样到约 maxPoints 个点（用于绘图）
function downsample(ele: number[], maxPoints: number): number[] {
  if (ele.length <= maxPoints) return ele
  const step = ele.length / maxPoints
  const out: number[] = []
  for (let i = 0; i < maxPoints; i++) {
    out.push(ele[Math.floor(i * step)])
  }
  out.push(ele[ele.length - 1])
  return out
}

// 用阈值法从一段海拔序列累计爬升
function elevationGainFromProfile(ele: number[], threshold = GAIN_THRESHOLD): number {
  if (ele.length < 2) return 0
  let gain = 0
  let ref = ele[0]
  for (let i = 1; i < ele.length; i++) {
    const d = ele[i] - ref
    if (d >= threshold) {
      gain += d
      ref = ele[i]
    } else if (ele[i] < ref) {
      ref = ele[i]
    }
  }
  return gain
}

// 不同天的路径颜色
const DAY_COLORS = [
  '#3B82F6', // 蓝
  '#10B981', // 绿
  '#F59E0B', // 橙
  '#EF4444', // 红
  '#8B5CF6', // 紫
  '#EC4899', // 粉
  '#06B6D4', // 青
  '#84CC16', // 黄绿
  '#F97316', // 深橙
  '#6366F1', // 靛蓝
]

// 两点间距离（公里，Haversine）
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function pathDistance(positions: Array<[number, number]>): number {
  let total = 0
  for (let i = 1; i < positions.length; i++) {
    total += haversine(positions[i - 1], positions[i])
  }
  return total
}

function segmentElevationGain(markers: TrailMarker[]): number {
  let total = 0
  for (let i = 1; i < markers.length; i++) {
    const diff = markers[i].elevation - markers[i - 1].elevation
    if (diff > 0) total += diff
  }
  return total
}

function ItineraryPlanner({ gpxWaypoints, gpxTrack, trackElevations, trailName, trailNameEn, initialPlan, onPlanChange, onPathsChange, onCampsitesChange, onFocusCampsite, className }: ItineraryPlannerProps) {
  const restoredPlanRef = useRef(initialPlan ?? null)
  const skipAutoSplitRef = useRef(!!initialPlan)

  const orderedMarkers = useMemo(
    () => (gpxWaypoints && gpxWaypoints.length > 0 ? waypointsToMarkers(gpxWaypoints) : []),
    [gpxWaypoints]
  )
  const markerCount = orderedMarkers.length

  // 该路线的露营点
  const campsites = useMemo(() => getAllCampsites(), [])

  const hasTrack = !!(gpxTrack && gpxTrack.length > 0)
  const hasTrackEle = !!(trackElevations && gpxTrack && trackElevations.length === gpxTrack.length)

  // 是否为环线：轨迹首尾非常接近（<500 米）
  const isLoopTrail = useMemo(() => {
    if (!hasTrack || gpxTrack!.length < 2) return false
    return haversine(gpxTrack![0], gpxTrack![gpxTrack!.length - 1]) < 0.5
  }, [hasTrack, gpxTrack])

  // 每个标记点在轨迹上的最近索引
  const markerTrackIndex = useMemo(() => {
    if (!hasTrack) return []
    return orderedMarkers.map((m) => {
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < gpxTrack!.length; i++) {
        const dLat = gpxTrack![i][0] - m.lat
        const dLng = gpxTrack![i][1] - m.lng
        const d = dLat * dLat + dLng * dLng
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    })
  }, [orderedMarkers, gpxTrack, hasTrack])

  const [numDays, setNumDays] = useState<number | null>(() => initialPlan?.numDays ?? null)
  const [startMarker, setStartMarker] = useState(() => initialPlan?.startMarker ?? 0)
  const [isLoop, setIsLoop] = useState(() => initialPlan?.isLoop ?? false)
  const [reverse, setReverse] = useState(() => initialPlan?.reverse ?? false)
  const [splitIndices, setSplitIndices] = useState<number[]>(() => initialPlan?.splitIndices ?? [])
  const [dayCampsites, setDayCampsites] = useState<Record<number, string>>(
    () => initialPlan?.dayCampsites ?? {}
  )

  const canSyncPlan = markerCount >= 2 || numDays === null

  const loopMode = isLoop && isLoopTrail

  // 走行路线序列（元素为标记点原始索引）
  const routeSeq = useMemo(() => {
    if (markerCount < 2) return []
    const last = markerCount - 1
    const seq: number[] = []
    if (loopMode) {
      if (!reverse) {
        // 起点 → last → 0 → 起点
        for (let i = startMarker; i <= last; i++) seq.push(i)
        for (let i = 0; i <= startMarker; i++) seq.push(i)
      } else {
        // 起点 → 0 → last → 起点（反向绕圈）
        for (let i = startMarker; i >= 0; i--) seq.push(i)
        for (let i = last; i >= startMarker; i--) seq.push(i)
      }
    } else {
      if (!reverse) {
        // 起点 → 终点（M_last）
        for (let i = startMarker; i <= last; i++) seq.push(i)
      } else {
        // 反向：从起点朝 M001 方向走；若起点已是 M001，则整段从原终点反向走回 M001
        if (startMarker === 0) {
          for (let i = last; i >= 0; i--) seq.push(i)
        } else {
          for (let i = startMarker; i >= 0; i--) seq.push(i)
        }
      }
    }
    return seq
  }, [markerCount, loopMode, startMarker, reverse])

  const routeLen = routeSeq.length
  const maxDays = Math.max(1, Math.min(MAX_DAYS, routeLen - 1))

  // 起点/方向变化时，若线性路线剩余段数不足，收敛起点
  useEffect(() => {
    if (loopMode || markerCount < 2 || reverse) return
    if (startMarker > markerCount - 2) {
      setStartMarker(markerCount - 2)
    }
  }, [loopMode, reverse, markerCount, startMarker])

  // 从 URL / localStorage 恢复的规划：等标记点就绪后写入，并覆盖上面的自动收敛
  useEffect(() => {
    const plan = restoredPlanRef.current
    if (!plan || markerCount < 2) return

    restoredPlanRef.current = null
    skipAutoSplitRef.current = true
    setStartMarker(plan.startMarker)
    setReverse(plan.reverse)
    setIsLoop(plan.isLoop)
    setNumDays(plan.numDays)
    setSplitIndices(plan.splitIndices)
    setDayCampsites(plan.dayCampsites)
  }, [markerCount])

  // 路线序列或天数变化时，重新按均分初始化分界点
  useEffect(() => {
    if (numDays === null) {
      setSplitIndices([])
      return
    }
    // GPX 未加载时保留已恢复的分界点，不要清空
    if (routeLen < 2) return

    const days = Math.min(numDays, maxDays)
    if (days !== numDays) {
      setNumDays(days)
      return
    }
    if (skipAutoSplitRef.current) {
      skipAutoSplitRef.current = false
      if (splitIndices.length === days - 1) return
    }
    const splits: number[] = []
    for (let i = 1; i < days; i++) {
      splits.push(Math.round(((routeLen - 1) * i) / days))
    }
    setSplitIndices(splits)
  }, [numDays, routeLen, maxDays, splitIndices.length])

  // 构建整条走行路线的轨迹点/海拔，并记录每个序列节点在其中的偏移
  const routeGeometry = useMemo(() => {
    const positions: Array<[number, number]> = []
    const elevations: number[] = []
    const nodeOffset: number[] = [] // nodeOffset[k] = routeSeq[k] 在 positions 中的下标

    if (routeLen < 2) return { positions, elevations, nodeOffset }

    if (hasTrack) {
      const lastTrack = gpxTrack!.length - 1
      const range = (lo: number, hi: number) => {
        const r: number[] = []
        for (let i = lo; i <= hi; i++) r.push(i)
        return r
      }
      // 一条边（节点 a→b）对应的轨迹索引序列（走行方向）
      const edgeIndices = (a: number, b: number): number[] => {
        const ia = markerTrackIndex[a]
        const ib = markerTrackIndex[b]
        if (Math.abs(a - b) === 1) {
          // 普通相邻边：沿轨迹从 ia 走到 ib
          return ib >= ia ? range(ia, ib) : range(ib, ia).reverse()
        }
        // 环线闭合边（连接 0 与 last，绕过闭合点）
        const forward = [...range(markerTrackIndex[markerCount - 1], lastTrack), ...range(0, markerTrackIndex[0])]
        // forward 表示 last → 0 的走行；若本边是 0 → last 则取逆序
        return a === markerCount - 1 ? forward : forward.slice().reverse()
      }

      const idxSeq: number[] = []
      for (let k = 0; k < routeSeq.length - 1; k++) {
        const eIdx = edgeIndices(routeSeq[k], routeSeq[k + 1])
        if (k === 0) {
          nodeOffset[0] = 0
          idxSeq.push(...eIdx)
        } else {
          idxSeq.push(...eIdx.slice(1))
        }
        nodeOffset[k + 1] = idxSeq.length - 1
      }
      for (const i of idxSeq) {
        positions.push(gpxTrack![i])
        if (hasTrackEle) elevations.push(trackElevations![i])
      }
    } else {
      // 无轨迹：用标记点直连
      routeSeq.forEach((k, i) => {
        positions.push([orderedMarkers[k].lat, orderedMarkers[k].lng])
        elevations.push(orderedMarkers[k].elevation)
        nodeOffset[i] = i
      })
    }

    return { positions, elevations, nodeOffset }
  }, [routeSeq, routeLen, hasTrack, hasTrackEle, markerTrackIndex, gpxTrack, trackElevations, orderedMarkers])

  // 路线序列各节点的累计距离（公里）
  const nodeCumulativeKm = useMemo(() => {
    const { positions, nodeOffset } = routeGeometry
    if (routeLen < 1) return []
    const cum: number[] = [0]
    for (let k = 1; k < routeLen; k++) {
      const segPositions = positions.slice(nodeOffset[k - 1], nodeOffset[k] + 1)
      cum.push(cum[k - 1] + pathDistance(segPositions))
    }
    return cum
  }, [routeGeometry, routeLen])

  // 由分界点推导出每天的分段（基于路线序列位置）
  const daySummaries = useMemo(() => {
    if (routeLen < 2 || numDays === null) return []
    const bounds = [0, ...splitIndices, routeLen - 1]
    const { positions, elevations, nodeOffset } = routeGeometry
    const useEle = hasTrackEle || !hasTrack

    const out = []
    for (let i = 0; i < bounds.length - 1; i++) {
      const pa = bounds[i]
      const pb = bounds[i + 1]
      const startNode = routeSeq[pa]
      const endNode = routeSeq[pb]
      const posLo = nodeOffset[pa]
      const posHi = nodeOffset[pb]
      const segPositions = positions.slice(posLo, posHi + 1)
      const segMarkers = routeSeq.slice(pa, pb + 1).map((k) => orderedMarkers[k])

      let gain = 0
      let profile: number[] | undefined
      if (useEle && elevations.length > 0) {
        const eleSlice = elevations.slice(posLo, posHi + 1)
        gain = elevationGainFromProfile(eleSlice)
        profile = downsample(eleSlice, 150)
      } else {
        gain = segmentElevationGain(segMarkers)
      }

      out.push({
        day: i + 1,
        paPos: pa,
        pbPos: pb,
        startNode,
        endNode,
        color: DAY_COLORS[i % DAY_COLORS.length],
        positions: segPositions,
        markers: segMarkers,
        gain,
        distance: pathDistance(segPositions),
        profile,
      })
    }
    return out
  }, [routeLen, splitIndices, routeGeometry, routeSeq, orderedMarkers, hasTrack, hasTrackEle, numDays])

  // 供地图使用的路径
  const dayPaths = useMemo(
    (): DayPath[] =>
      daySummaries
        .filter((s) => s.positions.length >= 2)
        .map((s) => ({ day: s.day, positions: s.positions, color: s.color, markers: s.markers })),
    [daySummaries]
  )

  useEffect(() => {
    onPathsChange?.(dayPaths)
  }, [dayPaths, onPathsChange])

  // 全程海拔剖面（下采样到约 300 点用于绘图）
  const profileForChart = useMemo(
    () => (routeGeometry.elevations.length > 1 ? downsample(routeGeometry.elevations, 300) : undefined),
    [routeGeometry]
  )

  // 记录哪些天的高度图已展开
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})
  const toggleDay = (day: number) =>
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }))

  // 每天选择的露营点（day -> campsiteId，'' 表示未选）
  const [planCopied, setPlanCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // 选中的露营点（供地图高亮）
  const selectedCampsites = useMemo((): SelectedCampsite[] => {
    return daySummaries
      .filter((seg) => dayCampsites[seg.day])
      .map((seg) => ({ id: dayCampsites[seg.day], day: seg.day, color: seg.color }))
  }, [daySummaries, dayCampsites])

  useEffect(() => {
    onCampsitesChange?.(selectedCampsites)
  }, [selectedCampsites, onCampsitesChange])

  // 同步规划状态到 URL / localStorage（等标记点就绪后再同步，避免覆盖分享链接）
  useEffect(() => {
    if (!canSyncPlan) return
    onPlanChange?.({
      startMarker,
      reverse,
      isLoop,
      numDays,
      splitIndices,
      dayCampsites,
    })
  }, [canSyncPlan, startMarker, reverse, isLoop, numDays, splitIndices, dayCampsites, onPlanChange])

  // 更新某个分界点（路线序列位置），并保持分界点严格递增
  const updateSplit = (boundaryPos: number, seqPos: number) => {
    setSplitIndices((prev) => {
      const next = [...prev]
      next[boundaryPos] = seqPos
      for (let i = boundaryPos + 1; i < next.length; i++) {
        if (next[i] <= next[i - 1]) next[i] = next[i - 1] + 1
      }
      for (let i = boundaryPos - 1; i >= 0; i--) {
        if (next[i] >= next[i + 1]) next[i] = next[i + 1] - 1
      }
      return next
    })
  }

  const bounds = [0, ...splitIndices, Math.max(0, routeLen - 1)]

  const totalDistance = pathDistance(routeGeometry.positions)
  // 全程爬升直接对整条走行路线算，避免各段边界重复/遗漏
  const totalElevation =
    routeGeometry.elevations.length > 1
      ? elevationGainFromProfile(routeGeometry.elevations)
      : daySummaries.reduce((sum, s) => sum + s.gain, 0)

  const markerLabel = (idx: number) => {
    const m = orderedMarkers[idx]
    return m ? toZhHans(m.name || m.id) : ''
  }

  const balanceSplitsByDistance = () => {
    if (numDays === null || routeLen < 2) return
    const splits = computeDistanceBalancedSplits(numDays, routeLen, nodeCumulativeKm)
    if (splits.length === numDays - 1) {
      setSplitIndices(splits)
    }
  }

  // 起点下拉可选索引（反向时倒序展示）
  const startMarkerOptions = useMemo(() => {
    const indices = Array.from({ length: markerCount }, (_, i) => i).filter((idx) => {
      if (!loopMode && !reverse && idx > markerCount - 2) return false
      return true
    })
    return reverse ? indices.reverse() : indices
  }, [markerCount, loopMode, reverse])

  const routeDescription = loopMode
    ? `环线：${markerLabel(routeSeq[0])} 出发绕行全程返回`
    : `从 ${markerLabel(routeSeq[0])} 走到 ${markerLabel(routeSeq[routeLen - 1])}`

  const planText = useMemo(() => {
    if (numDays === null || daySummaries.length === 0) return ''

    return formatPlanTemplate({
      trailName: trailName ?? '徒步路线',
      trailNameEn: trailNameEn,
      routeDescription,
      reverse,
      loopMode,
      numDays,
      totalDistance,
      totalElevation,
      days: daySummaries.map((seg, i) => {
        const campId = dayCampsites[seg.day]
        const campsite = campId ? campsites.find((c) => c.id === campId) : undefined
        return {
          day: seg.day,
          startLabel: markerLabel(seg.startNode),
          endLabel: markerLabel(seg.endNode),
          distance: seg.distance,
          elevation: seg.gain,
          markerCount: seg.markers.length,
          campsiteName: i < daySummaries.length - 1 ? campsite?.name : undefined,
          campsiteAddress: i < daySummaries.length - 1 ? campsite?.address : undefined,
          campsiteWaterSource: i < daySummaries.length - 1 ? campsite?.detailsZhHans?.waterSourceZhHans : undefined,
          campsiteSanitary: i < daySummaries.length - 1 ? campsite?.detailsZhHans?.sanitaryFacilitiesZhHans : undefined,
        }
      }),
    })
  }, [
    numDays,
    daySummaries,
    trailName,
    trailNameEn,
    routeDescription,
    reverse,
    loopMode,
    totalDistance,
    totalElevation,
    dayCampsites,
    campsites,
    orderedMarkers,
  ])

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const copyPlanText = async () => {
    if (!planText) return
    try {
      await navigator.clipboard.writeText(planText)
      setPlanCopied(true)
      window.setTimeout(() => setPlanCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = planText
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setPlanCopied(true)
      window.setTimeout(() => setPlanCopied(false), 2000)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden h-full flex flex-col ${className ?? ''}`}>
      <div className="bg-blue-600 text-white px-4 py-3">
        <h2 className="text-lg font-bold">行程规划</h2>
        <p className="text-xs text-blue-100 mt-0.5">选择几天走完，并调整每天的起终点</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {markerCount < 2 ? (
          <div className="p-4 text-sm text-gray-500">暂无标记点数据，无法规划行程。</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* 起点选择 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                从哪里出发？
              </label>
              <select
                value={startMarker}
                onChange={(e) => setStartMarker(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {startMarkerOptions.map((idx) => {
                  const m = orderedMarkers[idx]
                  return (
                    <option key={idx} value={idx} className="text-gray-900">
                      {toZhHans(m.name || m.id)}
                      {idx === 0 ? '（原起点）' : ''}
                      {idx === markerCount - 1 ? '（原终点）' : ''}
                    </option>
                  )
                })}
              </select>

              <div className="mt-2 space-y-1.5">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reverse}
                    onChange={(e) => setReverse(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">反向走（朝相反方向）</span>
                </label>
                {isLoopTrail && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLoop}
                      onChange={(e) => setIsLoop(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      环线模式（从起点绕一整圈回到起点）
                    </span>
                  </label>
                )}
              </div>

              <p className="mt-1.5 text-xs text-gray-400">
                {routeDescription}
              </p>
            </div>

            {/* 天数选择 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">几天走完？</label>
              <select
                value={numDays ?? ''}
                onChange={(e) => setNumDays(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-500">
                  请选择天数
                </option>
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n} className="text-gray-900">
                    {n} 天走完
                  </option>
                ))}
              </select>
              {numDays === null && (
                <p className="mt-1.5 text-xs text-gray-400">选择天数后可规划每日路段与露营点</p>
              )}
            </div>

            {/* 每天分段 */}
            {numDays !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-gray-700">每日路段</label>
                <button
                  type="button"
                  onClick={balanceSplitsByDistance}
                  className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  按距离均衡
                </button>
              </div>
              {daySummaries.map((seg, i) => {
                const isLast = i === daySummaries.length - 1
                const distance = seg.distance
                const elevation = Math.round(seg.gain)
                const color = seg.color

                // 该天终点分界可选范围（路线序列位置）：上一分界+1 .. 下一分界-1
                const lower = bounds[i] + 1
                const upper = bounds[i + 2] - 1

                // 当天终点附近的露营点（就近筛选，前后最近的若干个）
                const endMarker = orderedMarkers[seg.endNode]
                const selCampId = dayCampsites[seg.day]
                const nearbyCampsites = pickNearbyCampsites(endMarker, campsites, selCampId)

                return (
                  <div key={seg.day} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <span
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-sm text-gray-800">第 {seg.day} 天</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">起点</div>
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-700">
                          {markerLabel(seg.startNode)}
                        </div>
                      </div>

                      <div className="pt-5 text-gray-400">→</div>

                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">终点</div>
                        {isLast ? (
                          <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-700">
                            {markerLabel(seg.endNode)}
                          </div>
                        ) : (
                          <select
                            value={seg.pbPos}
                            onChange={(e) => updateSplit(i, Number(e.target.value))}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(() => {
                              const positions = Array.from(
                                { length: Math.max(0, upper - lower + 1) },
                                (_, k) => lower + k
                              )
                              return (reverse ? positions.reverse() : positions).map((pos) => (
                                <option key={pos} value={pos} className="text-gray-900">
                                  {markerLabel(routeSeq[pos])}
                                </option>
                              ))
                            })()}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {seg.markers.length} 个标记点 · 距离 ~{distance.toFixed(1)} 公里 · 爬升 {elevation} 米
                    </div>

                    {/* 当晚露营点（最后一天到达终点，无需露营） */}
                    {!isLast && campsites.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-400 mb-1">
                          当晚露营点
                          <span className="text-gray-300">（{markerLabel(seg.endNode)} 附近）</span>
                        </div>
                        {nearbyCampsites.length > 0 ? (
                          <select
                            value={selCampId ?? ''}
                            onChange={(e) => {
                              const id = e.target.value
                              setDayCampsites((prev) => ({ ...prev, [seg.day]: id }))
                              if (id) onFocusCampsite?.(id)
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="" className="text-gray-900">
                              不露营 / 未选择
                            </option>
                            {nearbyCampsites.map(({ c, dist }) => (
                              <option key={c.id} value={c.id} className="text-gray-900">
                                {toZhHans(c.name)}（约 {dist.toFixed(1)}km）
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-gray-400">附近暂无露营点数据</p>
                        )}
                        {selCampId && nearbyCampsites.length > 0 && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            已标记宿营地，地图上高亮显示
                          </div>
                        )}
                      </div>
                    )}

                    {/* 当天高度图（默认折叠） */}
                    {seg.profile && seg.profile.length > 1 && (
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <button
                          type="button"
                          onClick={() => toggleDay(seg.day)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <svg
                            className={`w-3.5 h-3.5 transition-transform ${expandedDays[seg.day] ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {expandedDays[seg.day] ? '收起当天高度图' : '查看当天高度图'}
                        </button>
                        {expandedDays[seg.day] && (
                          <div className="mt-2">
                            <ElevationChart
                              markers={seg.markers}
                              profile={seg.profile}
                              elevationGain={elevation}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )}

            {/* 总计 */}
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-800 mb-1">全程合计</p>
              <p>总距离: ~{totalDistance.toFixed(1)} 公里</p>
              <p>总爬升: {Math.round(totalElevation)} 米</p>
            </div>

            {/* 文字版计划 */}
            {numDays !== null && daySummaries.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">文字版计划</h3>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={copyShareLink}
                      disabled={!canSyncPlan}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {linkCopied ? '已复制链接' : '复制分享链接'}
                    </button>
                    <button
                      type="button"
                      onClick={copyPlanText}
                      className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {planCopied ? '已复制' : '复制计划'}
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={planText}
                  rows={12}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full resize-y rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1.5 text-xs text-gray-400">点击文本框可全选，或直接点「复制计划」保存到备忘录</p>
              </div>
            )}

            {/* 爬升图 */}
            {orderedMarkers.length > 1 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">全程爬升高度图</h3>
                <ElevationChart
                  markers={orderedMarkers}
                  profile={profileForChart}
                  elevationGain={Math.round(totalElevation)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ItineraryPlanner
