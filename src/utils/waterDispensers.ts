import waterData from '../data/waterDispensers.json'

export interface WaterDispenser {
  id: string
  facId: string
  name: string
  facility: string
  location?: string
  countryPark?: string
  lat: number
  lng: number
  dispenserType?: string
  serviceHour?: string
  venueType?: string
  waterTemp?: string
}

const allPoints: WaterDispenser[] = waterData.points as WaterDispenser[]

export function getAllWaterDispensers(): WaterDispenser[] {
  return allPoints
}

/** 距路径不超过 maxKm 的郊野公园加水站（默认 0.6 km，避免全览过密） */
export function findWaterDispensersNearPath(
  positions: Array<[number, number]>,
  maxKm = 0.6
): WaterDispenser[] {
  return findWaterDispensersAlongPath(positions, maxKm).map(
    ({ pathIndex: _i, distanceKm: _d, ...point }) => point
  )
}

export interface WaterDispenserAlongPath extends WaterDispenser {
  pathIndex: number
  distanceKm: number
}

/** 找出距某段路径不超过 maxKm 的加水站，按途经顺序排列 */
export function findWaterDispensersAlongPath(
  positions: Array<[number, number]>,
  maxKm = 0.6
): WaterDispenserAlongPath[] {
  if (positions.length === 0) return []

  const hit: WaterDispenserAlongPath[] = []
  const step = Math.max(1, Math.floor(positions.length / 400))

  for (const point of allPoints) {
    let bestD = Infinity
    let bestI = 0
    for (let i = 0; i < positions.length; i += step) {
      const d = haversineKm(point.lat, point.lng, positions[i][0], positions[i][1])
      if (d < bestD) {
        bestD = d
        bestI = i
      }
    }
    const lo = Math.max(0, bestI - step)
    const hi = Math.min(positions.length - 1, bestI + step)
    for (let i = lo; i <= hi; i++) {
      const d = haversineKm(point.lat, point.lng, positions[i][0], positions[i][1])
      if (d < bestD) {
        bestD = d
        bestI = i
      }
    }
    if (bestD <= maxKm) {
      hit.push({ ...point, pathIndex: bestI, distanceKm: bestD })
    }
  }

  hit.sort((a, b) => a.pathIndex - b.pathIndex || a.distanceKm - b.distanceKm)
  return hit
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
