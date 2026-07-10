import { useCallback, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Trail } from '../data/trails'
import { GPXWaypoint, waypointsToMarkers, formatMarkerLabel } from '../utils/gpxParser'
import { DayPath } from './ItineraryPlanner'
import { SelectedCampsite, getAllCampsites, getCampsitesByTrail, Campsite } from '../utils/campsites'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'
import CampsitePopup from './CampsitePopup'
import { MapControls } from './MapControls'
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

function HideZoomControl() {
  const map = useMap()

  useEffect(() => {
    if (map.zoomControl) {
      map.removeControl(map.zoomControl)
    }
  }, [map])

  return null
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
  fitPadding = DEFAULT_FIT_PADDING,
}: TrailMapProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()

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

  return (
    <div className="w-full h-full absolute inset-0">
      {onShowAllCampsitesChange && (
        <MapControls
          dayPaths={dayPaths}
          showAllCampsites={showAllCampsites}
          onShowAllCampsitesChange={onShowAllCampsitesChange}
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* 始终显示完整的原始轨迹作为背景 */}
        {fullTrackPositions.length > 0 && (
          <Polyline
            positions={fullTrackPositions}
            pathOptions={{ color: trail.color, weight: 3, opacity: 0.5 }}
          />
        )}
        {/* 如果有dayPaths，显示多天路径；否则显示默认路径 */}
        {dayPaths && dayPaths.length > 0 ? (
          dayPaths.map(path => (
            <Polyline
              key={path.day}
              positions={path.positions}
              pathOptions={{ color: path.color, weight: 5 }}
            />
          ))
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
      </MapContainer>
    </div>
  )
}

export default TrailMap

