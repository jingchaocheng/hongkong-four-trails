import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Trail } from '../data/trails'
import { GPXWaypoint, waypointsToMarkers } from '../utils/gpxParser'
import { DayPath } from './ItineraryPlanner'
import { SelectedCampsite, getAllCampsites, Campsite } from '../utils/campsites'
import CampsitePopup from './CampsitePopup'
import 'leaflet/dist/leaflet.css'

const campsiteIcon = L.divIcon({
  className: 'campsite-marker',
  html: `
    <div class="campsite-marker-inner" title="露营点">
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path d="M4 20h16L12 4 4 20z" fill="#dc2626" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M12 4v16" stroke="#ffffff" stroke-width="2"/>
        <path d="M12 4v16" stroke="#991b1b" stroke-width="1.2"/>
        <circle cx="12" cy="9.5" r="1.8" fill="#fde047" stroke="#ffffff" stroke-width="0.8"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

// 选中（当天宿营）的露营点：更大、用当天颜色、带天数徽标
function makeSelectedCampsiteIcon(color: string, day: number) {
  return L.divIcon({
    className: 'campsite-marker',
    html: `
      <div class="campsite-marker-inner campsite-marker-selected" title="第${day}天宿营">
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
  gpxTrack?: Array<[number, number]> // GPX轨迹点
  gpxWaypoints?: GPXWaypoint[] // GPX标注点
  dayPaths?: DayPath[] // 多天路径数据
  selectedCampsites?: SelectedCampsite[] // 每天选定的宿营点
  fitPadding?: MapFitPadding
}

const DEFAULT_FIT_PADDING: MapFitPadding = {
  topLeft: [72, 72],
  bottomRight: [48, 48],
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

function FitMapBounds({
  positions,
  padding,
}: {
  positions: Array<[number, number]>
  padding: MapFitPadding
}) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 0) return

    let cancelled = false
    const timers: number[] = []

    const fit = () => {
      if (cancelled) return

      map.invalidateSize({ animate: false })

      if (positions.length === 1) {
        map.setView(positions[0], 14, { animate: false })
        return
      }

      map.fitBounds(L.latLngBounds(positions), {
        paddingTopLeft: L.point(padding.topLeft[0], padding.topLeft[1]),
        paddingBottomRight: L.point(padding.bottomRight[0], padding.bottomRight[1]),
        maxZoom: 14,
        animate: false,
      })
    }

    const scheduleFit = () => {
      fit()
      requestAnimationFrame(fit)
      timers.push(window.setTimeout(fit, 150), window.setTimeout(fit, 400))
    }

    map.whenReady(scheduleFit)
    map.on('resize', fit)

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      map.off('resize', fit)
    }
  }, [map, positions, padding])

  return null
}

function TrailMap({
  trail,
  selectedMarkers,
  showElevation = false,
  gpxTrack,
  gpxWaypoints,
  dayPaths,
  selectedCampsites,
  fitPadding = DEFAULT_FIT_PADDING,
}: TrailMapProps) {
  const selectedCampsiteMap = useMemo(() => {
    const map = new Map<string, SelectedCampsite>()
    ;(selectedCampsites ?? []).forEach((c) => map.set(c.id, c))
    return map
  }, [selectedCampsites])
  const mapCampsites = useMemo((): Campsite[] => getAllCampsites(), [])
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
            <Popup>
              <div>
                <strong>{marker.id} - {marker.name}</strong>
                {showElevation && (
                  <p className="mt-1">海拔: {marker.elevation}米</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {mapCampsites.map((point) => {
          const selected = selectedCampsiteMap.get(point.id)
          return (
            <Marker
              key={`campsite-${point.id}`}
              position={[point.lat, point.lng]}
              icon={selected ? makeSelectedCampsiteIcon(selected.color, selected.day) : campsiteIcon}
              zIndexOffset={selected ? 2500 : 1500}
              riseOnHover
            >
              <Popup className="campsite-popup-wrapper" maxWidth={480} minWidth={380}>
                <CampsitePopup campsite={point} selected={selected} />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default TrailMap

