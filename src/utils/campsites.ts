import mapGovData from '../data/mapGovPoints.json'

export interface Campsite {
  id: string
  trailId: string
  name: string
  nameEn: string
  address: string
  lat: number
  lng: number
  faciType: string
}

const allCampsites = mapGovData.points as Campsite[]

export function getCampsitesByTrail(trailId: string): Campsite[] {
  return allCampsites.filter((p) => p.trailId === trailId)
}

// 每天选定的宿营点（供地图高亮）
export interface SelectedCampsite {
  id: string
  day: number
  color: string
}
