import { useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Trail } from '../data/trails'
import { GPXWaypoint, waypointsToMarkers } from '../utils/gpxParser'
import { DayPath } from './ItineraryPlanner'
import { SelectedCampsite } from '../utils/campsites'
import mapGovData from '../data/mapGovPoints.json'
import 'leaflet/dist/leaflet.css'

interface MapGovPoint {
  id: string
  trailId: string
  name: string
  nameEn: string
  address: string
  lat: number
  lng: number
  faciType: string
}

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
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
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

interface TrailMapProps {
  trail: Trail
  selectedMarkers?: string[]
  showElevation?: boolean
  gpxTrack?: Array<[number, number]> // GPX轨迹点
  gpxWaypoints?: GPXWaypoint[] // GPX标注点
  dayPaths?: DayPath[] // 多天路径数据
  selectedCampsites?: SelectedCampsite[] // 每天选定的宿营点
}

const allCampsitePoints = mapGovData.points as MapGovPoint[]

function TrailMap({ trail, selectedMarkers, showElevation = false, gpxTrack, gpxWaypoints, dayPaths, selectedCampsites }: TrailMapProps) {
  const selectedCampsiteMap = useMemo(() => {
    const map = new Map<string, SelectedCampsite>()
    ;(selectedCampsites ?? []).forEach((c) => map.set(c.id, c))
    return map
  }, [selectedCampsites])
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
  
  // 计算地图中心点
  const center: [number, number] = useMemo(() => {
    // 收集所有需要显示的点
    const allPositions: Array<[number, number]> = []
    
    // 如果有dayPaths，添加所有天的路径点
    if (dayPaths && dayPaths.length > 0) {
      dayPaths.forEach(path => {
        allPositions.push(...path.positions)
      })
    }
    
    // 添加完整轨迹的点（用于计算中心）
    if (fullTrackPositions.length > 0) {
      allPositions.push(...fullTrackPositions)
    } else if (defaultDisplayPositions.length > 0) {
      allPositions.push(...defaultDisplayPositions)
    }

    if (allPositions.length === 0) return [22.3, 114.2]
    const avgLat = allPositions.reduce((sum, pos) => sum + pos[0], 0) / allPositions.length
    const avgLng = allPositions.reduce((sum, pos) => sum + pos[1], 0) / allPositions.length
    return [avgLat, avgLng]
  }, [dayPaths, fullTrackPositions, defaultDisplayPositions])

  return (
    <div className="w-full h-full absolute inset-0">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        scrollWheelZoom={true}
      >
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
        {allCampsitePoints.map((point) => {
          const selected = selectedCampsiteMap.get(point.id)
          return (
            <Marker
              key={`campsite-${point.id}`}
              position={[point.lat, point.lng]}
              icon={selected ? makeSelectedCampsiteIcon(selected.color, selected.day) : campsiteIcon}
              zIndexOffset={selected ? 2000 : 1000}
            >
              <Popup>
                <div>
                  <strong>⛺ {point.name}</strong>
                  {selected && (
                    <p className="mt-1 text-sm font-semibold" style={{ color: selected.color }}>
                      第 {selected.day} 天宿营地
                    </p>
                  )}
                  {point.nameEn && <p className="mt-1 text-sm text-gray-600">{point.nameEn}</p>}
                  {point.address && <p className="mt-1 text-sm">{point.address}</p>}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default TrailMap

