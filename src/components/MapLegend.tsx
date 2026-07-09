import { DayPath } from './ItineraryPlanner'

function pathDistance(positions: Array<[number, number]>): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  let total = 0
  for (let i = 1; i < positions.length; i++) {
    const [lat1, lng1] = positions[i - 1]
    const [lat2, lng2] = positions[i]
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(h))
  }
  return total
}

interface DayPathLegendProps {
  dayPaths: DayPath[]
}

export function DayPathLegend({ dayPaths }: DayPathLegendProps) {
  if (dayPaths.length === 0) return null

  return (
    <div className="map-legend pointer-events-auto">
      <div className="map-legend-title">每日路段</div>
      <ul className="map-legend-list">
        {dayPaths.map((path) => {
          const dist = pathDistance(path.positions)
          return (
            <li key={path.day} className="map-legend-item">
              <span className="map-legend-swatch" style={{ backgroundColor: path.color }} />
              <span className="map-legend-label">第 {path.day} 天</span>
              <span className="map-legend-meta">~{dist.toFixed(1)} km</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
