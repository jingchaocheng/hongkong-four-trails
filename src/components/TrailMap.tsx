import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Trail } from '../data/trails'
import { GPXWaypoint, waypointsToMarkers, formatMarkerLabel } from '../utils/gpxParser'
import { DayPath } from './ItineraryPlanner'
import { SelectedCampsite, getAllCampsites, getCampsitesByTrail, Campsite } from '../utils/campsites'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'
import CampsitePopup from './CampsitePopup'
import SupplyPointPopup from './SupplyPointPopup'
import SupplyAnnotateForm, { SupplyAnnotateDraft } from './SupplyAnnotateForm'
import { MapControls } from './MapControls'
import {
  BasemapId,
  FALLBACK_BASEMAP_ID,
  getBasemapById,
  getStoredBasemapId,
  OSM_LOAD_TIMEOUT_MS,
  OSM_TILE_ERROR_THRESHOLD,
  setStoredBasemapId,
} from '../utils/mapBasemaps'
import {
  SupplyPoint,
  SupplyType,
  addDraftSupplyPoint,
  clearDraftSupplyPoints,
  copySupplyPointsJson,
  downloadSupplyPointsJson,
  findNearestMarkerId,
  getAllSupplyPoints,
  getDraftSupplyPoints,
  removeDraftSupplyPoint,
  supplyIconStyle,
} from '../utils/supplyPoints'
import 'leaflet/dist/leaflet.css'

export interface FocusCampsiteRequest {
  id: string
  seq: number
}

// 选中（当天宿营）的露营点：更大、用当天颜色、带天数徽标
function makeSelectedCampsiteIcon(color: string, day: number, title: string) {
  return L.divIcon({
    className: 'campsite-marker',
    html: `
      <div class="campsite-marker-inner campsite-marker-selected" title="${title}">
        <svg viewBox="0 0 24 24" width="39" height="39" aria-hidden="true">
          <path d="M4 20h16L12 4 4 20z" fill="${color}" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M12 4v16" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="9.5" r="1.8" fill="#fde047" stroke="#ffffff" stroke-width="0.8"/>
        </svg>
        <span class="campsite-day-badge" style="background:${color}">D${day}</span>
      </div>
    `,
    iconSize: [43, 43],
    iconAnchor: [21, 39],
    popupAnchor: [0, -39],
  })
}

// 路线标注点（M001 等）：默认图钉缩小 1/3
const waypointIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [17, 27],
  iconAnchor: [8, 27],
  popupAnchor: [1, -23],
  shadowSize: [27, 27],
  shadowAnchor: [8, 27],
})

function makeSupplyIcon(types: SupplyType[], isDraft: boolean) {
  const { bg, glyph } = supplyIconStyle(types)
  return L.divIcon({
    className: 'supply-marker',
    html: `
      <div class="supply-marker-inner ${isDraft ? 'is-draft' : ''}" style="background:${bg}" title="${glyph}">
        <span>${glyph}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function makeEndpointIcon(kind: 'start' | 'end' | 'loop') {
  const bg = kind === 'start' ? '#16a34a' : kind === 'end' ? '#dc2626' : '#7c3aed'
  const glyph = kind === 'start' ? '起' : kind === 'end' ? '终' : '环'
  return L.divIcon({
    className: 'endpoint-marker',
    html: `
      <div class="endpoint-marker-inner" style="background:${bg}">
        <span>${glyph}</span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  })
}

function MapClickCapture({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapFitPadding {
  topLeft: [number, number]
  bottomRight: [number, number]
}

interface TrailMapProps {
  trail: Trail
  selectedMarkers?: string[]
  showElevation?: boolean
  gpxTrack?: Array<[number, number]>
  gpxWaypoints?: GPXWaypoint[]
  dayPaths?: DayPath[]
  selectedCampsites?: SelectedCampsite[]
  showAllCampsites?: boolean
  onShowAllCampsitesChange?: (value: boolean) => void
  focusCampsite?: FocusCampsiteRequest | null
  focusedDay?: number | null
  fitPadding?: MapFitPadding
}

const DEFAULT_FIT_PADDING: MapFitPadding = {
  topLeft: [72, 72],
  bottomRight: [48, 48],
}

/** 与 TrailDetail 侧边栏 transition-duration-300 对齐 */
const DRAWER_TRANSITION_MS = 320

function FitMapBounds({
  positions,
  padding,
}: {
  positions: Array<[number, number]>
  padding: MapFitPadding
}) {
  const map = useMap()
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  const paddingRef = useRef(padding)
  paddingRef.current = padding
  const fittedPositionsKey = useRef('')

  const fit = useCallback(() => {
    const pos = positionsRef.current
    const pad = paddingRef.current
    if (pos.length === 0) return

    map.invalidateSize({ animate: false })

    if (pos.length === 1) {
      map.setView(pos[0], 14, { animate: false })
      return
    }

    map.fitBounds(L.latLngBounds(pos), {
      paddingTopLeft: L.point(pad.topLeft[0], pad.topLeft[1]),
      paddingBottomRight: L.point(pad.bottomRight[0], pad.bottomRight[1]),
      maxZoom: 14,
      animate: false,
    })
  }, [map])

  // 轨迹数据就绪时适配视野（GPX 加载等）
  useEffect(() => {
    if (positions.length === 0) return

    const key = `${positions.length}:${positions[0][0]},${positions[0][1]}:${positions[positions.length - 1][0]},${positions[positions.length - 1][1]}`
    if (fittedPositionsKey.current === key) return
    fittedPositionsKey.current = key

    let cancelled = false
    const timers: number[] = []

    const scheduleFit = () => {
      if (cancelled) return
      fit()
      requestAnimationFrame(() => {
        if (!cancelled) fit()
      })
      timers.push(window.setTimeout(() => {
        if (!cancelled) fit()
      }, 150))
      timers.push(window.setTimeout(() => {
        if (!cancelled) fit()
      }, 400))
    }

    map.whenReady(scheduleFit)

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [map, positions, fit])

  // 侧边栏展开/收起：仅刷新地图尺寸，保持当前缩放与中心
  const paddingKey = `${padding.topLeft.join(',')}|${padding.bottomRight.join(',')}`
  const skipPaddingSync = useRef(true)
  useEffect(() => {
    if (skipPaddingSync.current) {
      skipPaddingSync.current = false
      return
    }

    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false })
    }, DRAWER_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [map, paddingKey])

  // 窗口尺寸变化：只刷新尺寸，不重置视野
  useEffect(() => {
    const onResize = () => map.invalidateSize({ animate: false })
    map.on('resize', onResize)
    return () => {
      map.off('resize', onResize)
    }
  }, [map])

  return null
}

function FocusDayBounds({
  dayPaths,
  focusedDay,
  padding,
}: {
  dayPaths?: DayPath[]
  focusedDay?: number | null
  padding: MapFitPadding
}) {
  const map = useMap()
  const paddingRef = useRef(padding)
  paddingRef.current = padding

  useEffect(() => {
    if (focusedDay == null || !dayPaths?.length) return
    const path = dayPaths.find((p) => p.day === focusedDay)
    if (!path || path.positions.length === 0) return

    const pad = paddingRef.current
    const pos = path.positions

    if (pos.length === 1) {
      map.flyTo(pos[0], 14, { duration: 0.6 })
      return
    }

    map.flyToBounds(L.latLngBounds(pos), {
      paddingTopLeft: L.point(pad.topLeft[0], pad.topLeft[1]),
      paddingBottomRight: L.point(pad.bottomRight[0], pad.bottomRight[1]),
      maxZoom: 14,
      duration: 0.6,
    })
  }, [map, focusedDay, dayPaths])

  return null
}

function HideZoomControl() {
  const map = useMap()

  useEffect(() => {
    if (map.zoomControl) {
      map.removeControl(map.zoomControl)
    }
  }, [map])

  return null
}

/** 渲染底图瓦片；OSM 加载失败时通知上层切换备用底图 */
function BasemapTileLayers({
  basemapId,
  onOsmUnavailable,
}: {
  basemapId: BasemapId
  onOsmUnavailable: () => void
}) {
  const basemap = useMemo(() => getBasemapById(basemapId), [basemapId])
  const failCount = useRef(0)
  const successCount = useRef(0)
  const fellBack = useRef(false)

  useEffect(() => {
    failCount.current = 0
    successCount.current = 0
    fellBack.current = false
  }, [basemapId])

  useEffect(() => {
    if (basemapId !== 'osm') return
    const timer = window.setTimeout(() => {
      if (successCount.current === 0 && !fellBack.current) {
        fellBack.current = true
        onOsmUnavailable()
      }
    }, OSM_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [basemapId, onOsmUnavailable])

  const handleTileError = useCallback(() => {
    if (basemapId !== 'osm' || fellBack.current) return
    failCount.current += 1
    if (failCount.current >= OSM_TILE_ERROR_THRESHOLD && successCount.current === 0) {
      fellBack.current = true
      onOsmUnavailable()
    }
  }, [basemapId, onOsmUnavailable])

  const handleTileLoad = useCallback(() => {
    successCount.current += 1
  }, [])

  return (
    <>
      {basemap.layers.map((layer, index) => (
        <TileLayer
          key={`${basemapId}-${index}`}
          url={layer.url}
          {...(layer.attribution ? { attribution: layer.attribution } : {})}
          {...(layer.subdomains != null ? { subdomains: layer.subdomains } : {})}
          {...(layer.maxZoom != null ? { maxZoom: layer.maxZoom } : {})}
          eventHandlers={
            basemapId === 'osm'
              ? { tileerror: handleTileError, tileload: handleTileLoad }
              : undefined
          }
        />
      ))}
    </>
  )
}

function CampsiteMapMarker({
  point,
  selected,
  focusCampsite,
  defaultIcon,
  selectedTitle,
}: {
  point: Campsite
  selected?: SelectedCampsite
  focusCampsite?: FocusCampsiteRequest | null
  defaultIcon: L.DivIcon
  selectedTitle: (day: number) => string
}) {
  const markerRef = useRef<L.Marker>(null)
  const map = useMap()

  useEffect(() => {
    if (!focusCampsite || focusCampsite.id !== point.id) return
    const marker = markerRef.current
    if (!marker) return
    map.flyTo([point.lat, point.lng], 14, { duration: 0.8 })
    const timer = window.setTimeout(() => marker.openPopup(), 500)
    return () => window.clearTimeout(timer)
  }, [focusCampsite, point.id, point.lat, point.lng, map])

  return (
    <Marker
      ref={markerRef}
      position={[point.lat, point.lng]}
      icon={
        selected
          ? makeSelectedCampsiteIcon(selected.color, selected.day, selectedTitle(selected.day))
          : defaultIcon
      }
      zIndexOffset={selected ? 2500 : 1500}
      riseOnHover
    >
      <Popup className="campsite-popup-wrapper" maxWidth={480} minWidth={380}>
        <CampsitePopup campsite={point} selected={selected} />
      </Popup>
    </Marker>
  )
}

function TrailMap({
  trail,
  selectedMarkers,
  showElevation = false,
  gpxTrack,
  gpxWaypoints,
  dayPaths,
  selectedCampsites,
  showAllCampsites = false,
  onShowAllCampsitesChange,
  focusCampsite,
  focusedDay = null,
  fitPadding = DEFAULT_FIT_PADDING,
}: TrailMapProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()
  const [basemapId, setBasemapId] = useState<BasemapId>(() => getStoredBasemapId())
  const [annotateEnabled, setAnnotateEnabled] = useState(false)
  const [pendingAnnotate, setPendingAnnotate] = useState<SupplyAnnotateDraft | null>(null)
  const [supplyVersion, setSupplyVersion] = useState(0)
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const handleBasemapChange = useCallback((id: BasemapId) => {
    setBasemapId(id)
    setStoredBasemapId(id)
  }, [])

  const handleOsmUnavailable = useCallback(() => {
    setBasemapId(FALLBACK_BASEMAP_ID)
    setStoredBasemapId(FALLBACK_BASEMAP_ID)
  }, [])

  const refreshSupply = useCallback(() => {
    setSupplyVersion((v) => v + 1)
  }, [])

  const supplyPoints = useMemo(() => {
    void supplyVersion
    return getAllSupplyPoints().filter(
      (p) => p.trailIds.length === 0 || p.trailIds.includes(trail.id)
    )
  }, [trail.id, supplyVersion])

  const draftCount = useMemo(() => {
    void supplyVersion
    return getDraftSupplyPoints().length
  }, [supplyVersion])

  const handleMapAnnotateClick = useCallback(
    (lat: number, lng: number) => {
      if (!annotateEnabled) return
      const nearMarker = findNearestMarkerId(
        lat,
        lng,
        (gpxWaypoints ?? []).map((w) => ({ id: w.id, lat: w.lat, lng: w.lng }))
      )
      setPendingAnnotate({ lat, lng, nearMarker })
    },
    [annotateEnabled, gpxWaypoints]
  )

  const handleSaveAnnotate = useCallback(
    (data: { name: string; note: string; nearMarker: string; types: SupplyType[] }) => {
      if (!pendingAnnotate) return
      addDraftSupplyPoint({
        name: data.name,
        types: data.types,
        lat: pendingAnnotate.lat,
        lng: pendingAnnotate.lng,
        trailIds: [trail.id],
        nearMarker: data.nearMarker || undefined,
        note: data.note || undefined,
      })
      setPendingAnnotate(null)
      refreshSupply()
    },
    [pendingAnnotate, trail.id, refreshSupply]
  )

  const handleDeleteDraft = useCallback(
    (id: string) => {
      removeDraftSupplyPoint(id)
      refreshSupply()
    },
    [refreshSupply]
  )

  const handleExportJson = useCallback(async () => {
    const ok = await copySupplyPointsJson()
    setExportStatus(ok ? 'copied' : 'failed')
    window.setTimeout(() => setExportStatus('idle'), 2000)
  }, [])

  const handleDownloadJson = useCallback(() => {
    downloadSupplyPointsJson()
  }, [])

  const handleClearDrafts = useCallback(() => {
    clearDraftSupplyPoints()
    refreshSupply()
  }, [refreshSupply])

  const campsiteIconMemo = useMemo(
    () =>
      L.divIcon({
        className: 'campsite-marker',
        html: `
    <div class="campsite-marker-inner" title="${t('map.campsite')}">
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path d="M4 20h16L12 4 4 20z" fill="#dc2626" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M12 4v16" stroke="#ffffff" stroke-width="2"/>
        <path d="M12 4v16" stroke="#991b1b" stroke-width="1.2"/>
        <circle cx="12" cy="9.5" r="1.8" fill="#fde047" stroke="#ffffff" stroke-width="0.8"/>
      </svg>
    </div>
  `,
        iconSize: [36, 36] as L.PointExpression,
        iconAnchor: [18, 36] as L.PointExpression,
        popupAnchor: [0, -36] as L.PointExpression,
      }),
    [t]
  )

  const selectedCampsiteMap = useMemo(() => {
    const map = new Map<string, SelectedCampsite>()
    ;(selectedCampsites ?? []).forEach((c) => map.set(c.id, c))
    return map
  }, [selectedCampsites])
  const mapCampsites = useMemo((): Campsite[] => {
    return showAllCampsites ? getAllCampsites() : getCampsitesByTrail(trail.id)
  }, [showAllCampsites, trail.id])
  const allMarkers = useMemo(
    () => (gpxWaypoints && gpxWaypoints.length > 0 ? waypointsToMarkers(gpxWaypoints) : []),
    [gpxWaypoints]
  )

  // 如果指定了选中的标记点，只显示这些点之间的路径
  const displayMarkers = useMemo(() => {
    // 如果有dayPaths，收集所有天的标记点
    if (dayPaths && dayPaths.length > 0) {
      const allDayMarkers = dayPaths.flatMap(path => path.markers)
      // 去重，保持顺序
      const uniqueMarkers = Array.from(
        new Map(allDayMarkers.map(m => [m.id, m])).values()
      )
      return uniqueMarkers
    }
    
    if (selectedMarkers && selectedMarkers.length > 0) {
      // 保持原始顺序
      return allMarkers.filter((m) => selectedMarkers.includes(m.id))
        .sort((a, b) => {
          const indexA = selectedMarkers.indexOf(a.id)
          const indexB = selectedMarkers.indexOf(b.id)
          return indexA - indexB
        })
    }
    return allMarkers
  }, [allMarkers, selectedMarkers, dayPaths])

  // 获取完整的原始轨迹（用于背景显示）
  const fullTrackPositions = useMemo(() => {
    if (gpxTrack && gpxTrack.length > 0) {
      return gpxTrack
    }
    return allMarkers.map((m) => [m.lat, m.lng] as [number, number])
  }, [gpxTrack, allMarkers])

  // 如果有dayPaths，使用dayPaths；否则使用原来的逻辑
  const defaultDisplayPositions = useMemo(() => {
    if (gpxTrack && gpxTrack.length > 0) {
      // 如果选择了特定标记点，需要过滤GPX轨迹
      if (selectedMarkers && selectedMarkers.length > 0) {
        const selectedMarkersData = allMarkers.filter((m) => selectedMarkers.includes(m.id))
          .sort((a, b) => {
            const indexA = selectedMarkers.indexOf(a.id)
            const indexB = selectedMarkers.indexOf(b.id)
            return indexA - indexB
          })
        if (selectedMarkersData.length >= 2) {
          const start = selectedMarkersData[0]
          const end = selectedMarkersData[selectedMarkersData.length - 1]
          // 找到GPX轨迹中对应的点
          const startIndex = gpxTrack.findIndex(p => 
            Math.abs(p[0] - start.lat) < 0.01 && Math.abs(p[1] - start.lng) < 0.01
          )
          const endIndex = gpxTrack.findIndex(p => 
            Math.abs(p[0] - end.lat) < 0.01 && Math.abs(p[1] - end.lng) < 0.01
          )
          if (startIndex >= 0 && endIndex >= 0) {
            return gpxTrack.slice(
              Math.min(startIndex, endIndex),
              Math.max(startIndex, endIndex) + 1
            )
          }
        }
      }
      return gpxTrack
    }
    const markers = selectedMarkers && selectedMarkers.length > 0
      ? allMarkers.filter((m) => selectedMarkers.includes(m.id))
        .sort((a, b) => {
          const indexA = selectedMarkers.indexOf(a.id)
          const indexB = selectedMarkers.indexOf(b.id)
          return indexA - indexB
        })
      : allMarkers
    return markers.map((m) => [m.lat, m.lng] as [number, number])
  }, [gpxTrack, allMarkers, selectedMarkers])

  const boundsPositions = useMemo(() => {
    if (dayPaths && dayPaths.length > 0) {
      return dayPaths.flatMap((path) => path.positions)
    }
    if (fullTrackPositions.length > 0) {
      return fullTrackPositions
    }
    return defaultDisplayPositions
  }, [dayPaths, fullTrackPositions, defaultDisplayPositions])

  const hasDayFocus = focusedDay != null

  const routeEndpoints = useMemo(() => {
    type Ep = {
      lat: number
      lng: number
      label: string
      markerId?: string
    }

    const nearestMarker = (lat: number, lng: number, maxKm = 0.2) => {
      let best: (typeof allMarkers)[number] | null = null
      let bestD = Infinity
      for (const m of allMarkers) {
        const dLat = ((m.lat - lat) * Math.PI) / 180
        const dLng = ((m.lng - lng) * Math.PI) / 180
        const h =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((m.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2
        const d = 2 * 6371 * Math.asin(Math.sqrt(h))
        if (d < bestD) {
          bestD = d
          best = m
        }
      }
      if (!best || bestD > maxKm) return null
      return best
    }

    const fromPos = (
      pos: [number, number],
      fallbackLabel: string
    ): Ep => {
      const near = nearestMarker(pos[0], pos[1])
      if (near) {
        return {
          lat: pos[0],
          lng: pos[1],
          label: formatMarkerLabel(near, (text) => lc(text, 'traditional')),
          markerId: near.id,
        }
      }
      return { lat: pos[0], lng: pos[1], label: fallbackLabel }
    }

    let start: Ep | null = null
    let end: Ep | null = null

    // 优先用轨迹几何起终点（麦理浩径起点在 M001 之前约 500m）
    if (dayPaths && dayPaths.length > 0) {
      const firstDay = dayPaths[0]
      const lastDay = dayPaths[dayPaths.length - 1]
      const startPos =
        firstDay.positions[0] ??
        (firstDay.markers[0]
          ? ([firstDay.markers[0].lat, firstDay.markers[0].lng] as [number, number])
          : null)
      const endMarker = lastDay.markers[lastDay.markers.length - 1]
      const endPos =
        lastDay.positions[lastDay.positions.length - 1] ??
        (endMarker ? ([endMarker.lat, endMarker.lng] as [number, number]) : null)
      if (startPos) start = fromPos(startPos, t('map.startPoint'))
      if (endPos) end = fromPos(endPos, t('map.endPoint'))
    } else if (fullTrackPositions.length > 0) {
      // 用 GPX 轨迹端点，而非首个标距柱（如麦理浩径起点在 M001 之前）
      start = fromPos(fullTrackPositions[0], t('map.startPoint'))
      end = fromPos(
        fullTrackPositions[fullTrackPositions.length - 1],
        t('map.endPoint')
      )
    } else if (displayMarkers.length > 0) {
      const startMarker = displayMarkers[0]
      const endMarker = displayMarkers[displayMarkers.length - 1]
      start = {
        lat: startMarker.lat,
        lng: startMarker.lng,
        label: formatMarkerLabel(startMarker, (text) => lc(text, 'traditional')),
        markerId: startMarker.id,
      }
      end = {
        lat: endMarker.lat,
        lng: endMarker.lng,
        label: formatMarkerLabel(endMarker, (text) => lc(text, 'traditional')),
        markerId: endMarker.id,
      }
    }

    if (!start || !end) return null

    const samePoint =
      start.markerId && end.markerId
        ? start.markerId === end.markerId
        : Math.abs(start.lat - end.lat) < 0.0008 && Math.abs(start.lng - end.lng) < 0.0008

    return { start, end, samePoint }
  }, [dayPaths, displayMarkers, fullTrackPositions, allMarkers, lc, t])

  return (
    <div className={`w-full h-full absolute inset-0 ${annotateEnabled ? 'map-annotate-cursor' : ''}`}>
      <MapControls
        dayPaths={dayPaths}
        basemapId={basemapId}
        onBasemapChange={handleBasemapChange}
        showAllCampsites={showAllCampsites}
        onShowAllCampsitesChange={onShowAllCampsitesChange}
        annotateEnabled={annotateEnabled}
        onAnnotateEnabledChange={setAnnotateEnabled}
        draftCount={draftCount}
        onExportJson={handleExportJson}
        onDownloadJson={handleDownloadJson}
        onClearDrafts={handleClearDrafts}
        exportStatus={exportStatus}
      />
      {pendingAnnotate && (
        <SupplyAnnotateForm
          draft={pendingAnnotate}
          onCancel={() => setPendingAnnotate(null)}
          onSave={handleSaveAnnotate}
        />
      )}
      <MapContainer
        key={trail.id}
        center={[22.3, 114.2]}
        zoom={10}
        zoomControl={false}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        scrollWheelZoom={true}
      >
        <HideZoomControl />
        <FitMapBounds positions={boundsPositions} padding={fitPadding} />
        <FocusDayBounds dayPaths={dayPaths} focusedDay={focusedDay} padding={fitPadding} />
        <BasemapTileLayers basemapId={basemapId} onOsmUnavailable={handleOsmUnavailable} />
        <MapClickCapture enabled={annotateEnabled && !pendingAnnotate} onClick={handleMapAnnotateClick} />
        {/* 始终显示完整的原始轨迹作为背景 */}
        {fullTrackPositions.length > 0 && (
          <Polyline
            positions={fullTrackPositions}
            pathOptions={{
              color: trail.color,
              weight: 3,
              opacity: hasDayFocus ? 0.2 : 0.5,
            }}
          />
        )}
        {/* 如果有dayPaths，显示多天路径；否则显示默认路径 */}
        {dayPaths && dayPaths.length > 0 ? (
          dayPaths.map((path) => {
            const isFocused = hasDayFocus && path.day === focusedDay
            const isDimmed = hasDayFocus && path.day !== focusedDay
            return (
              <Polyline
                key={path.day}
                positions={path.positions}
                pathOptions={{
                  color: isDimmed ? '#9ca3af' : path.color,
                  weight: isFocused ? 7 : isDimmed ? 4 : 5,
                  opacity: isDimmed ? 0.35 : 1,
                }}
              />
            )
          })
        ) : (
          defaultDisplayPositions.length > 0 && (
            <Polyline
              positions={defaultDisplayPositions}
              pathOptions={{ color: trail.color, weight: 4 }}
            />
          )
        )}
        {displayMarkers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={waypointIcon}>
            <Popup className="waypoint-popup" minWidth={72}>
              <div className="waypoint-popup-content">
                <strong>{formatMarkerLabel(marker, (text) => lc(text, 'traditional'))}</strong>
                {showElevation && (
                  <p className="mt-1">{t('map.elevation')}: {t('map.elevationM', { n: marker.elevation })}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {routeEndpoints &&
          (routeEndpoints.samePoint ? (
            <Marker
              position={[routeEndpoints.start.lat, routeEndpoints.start.lng]}
              icon={makeEndpointIcon('loop')}
              zIndexOffset={3000}
            >
              <Popup className="waypoint-popup" minWidth={90}>
                <div className="waypoint-popup-content">
                  <strong>{t('map.loopEndpoint')}</strong>
                  <p className="mt-1">{routeEndpoints.start.label}</p>
                </div>
              </Popup>
            </Marker>
          ) : (
            <>
              <Marker
                position={[routeEndpoints.start.lat, routeEndpoints.start.lng]}
                icon={makeEndpointIcon('start')}
                zIndexOffset={3000}
              >
                <Popup className="waypoint-popup" minWidth={90}>
                  <div className="waypoint-popup-content">
                    <strong>{t('map.startPoint')}</strong>
                    <p className="mt-1">{routeEndpoints.start.label}</p>
                  </div>
                </Popup>
              </Marker>
              <Marker
                position={[routeEndpoints.end.lat, routeEndpoints.end.lng]}
                icon={makeEndpointIcon('end')}
                zIndexOffset={3000}
              >
                <Popup className="waypoint-popup" minWidth={90}>
                  <div className="waypoint-popup-content">
                    <strong>{t('map.endPoint')}</strong>
                    <p className="mt-1">{routeEndpoints.end.label}</p>
                  </div>
                </Popup>
              </Marker>
            </>
          ))}
        {mapCampsites.map((point) => {
          const selected = selectedCampsiteMap.get(point.id)
          return (
            <CampsiteMapMarker
              key={`campsite-${point.id}`}
              point={point}
              selected={selected}
              focusCampsite={focusCampsite}
              defaultIcon={campsiteIconMemo}
              selectedTitle={(day) => t('map.dayCamp', { n: day })}
            />
          )
        })}
        {supplyPoints.map((point: SupplyPoint) => (
          <Marker
            key={`supply-${point.id}`}
            position={[point.lat, point.lng]}
            icon={makeSupplyIcon(point.types, point.source === 'draft')}
            zIndexOffset={1800}
          >
            <Popup minWidth={160}>
              <SupplyPointPopup point={point} onDeleteDraft={handleDeleteDraft} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default TrailMap

