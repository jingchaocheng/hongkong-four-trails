import toiletData from '../data/toilets.json'

export interface CountryParkToilet {
  id: string
  facId: string
  name: string
  facility?: string
  countryPark?: string
  lat: number
  lng: number
  toiletType?: string
  barrierFree?: boolean
  /** 营地配套公厕，地图上不单独标注（看营地即可） */
  atCampsite?: boolean
  campsiteId?: string
  campsiteName?: string
}

const allPoints: CountryParkToilet[] = (toiletData.points as CountryParkToilet[]).filter(
  (p) => !p.atCampsite
)

export function getAllCountryParkToilets(): CountryParkToilet[] {
  return allPoints
}

/** 距路径不超过 maxKm 的郊野公园厕所（默认 0.6 km，避免全览过密） */
export function findToiletsNearPath(
  positions: Array<[number, number]>,
  maxKm = 0.6
): CountryParkToilet[] {
  if (positions.length === 0) return []

  const hit: CountryParkToilet[] = []
  const step = Math.max(1, Math.floor(positions.length / 400))

  for (const point of allPoints) {
    let bestD = Infinity
    for (let i = 0; i < positions.length; i += step) {
      const d = haversineKm(point.lat, point.lng, positions[i][0], positions[i][1])
      if (d < bestD) bestD = d
    }
    if (bestD <= maxKm) hit.push(point)
  }

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
