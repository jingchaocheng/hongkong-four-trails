import mapGovData from "../data/mapGovPoints.json";

export interface Campsite {
  id: string;
  trailId: string;
  name: string;
  nameEn: string;
  address: string;
  lat: number;
  lng: number;
  faciType: string;
}

// 政府地图未收录、无设施编号的补充露营点
const EXTRA_CAMPSITES: Campsite[] = [
  {
    id: "extra-pui-o",
    trailId: "lantau",
    name: "貝澳營地",
    nameEn: "Pui O Campsite",
    address: "貝澳",
    lat: 22.23932,
    lng: 113.97771,
    faciType: "CAMPSITE",
  },
];

const allCampsites = [...(mapGovData.points as Campsite[]), ...EXTRA_CAMPSITES];

export function getAllCampsites(): Campsite[] {
  return allCampsites;
}

export function getCampsitesByTrail(trailId: string): Campsite[] {
  return allCampsites.filter((p) => p.trailId === trailId);
}

// 每天选定的宿营点（供地图高亮）
export interface SelectedCampsite {
  id: string;
  day: number;
  color: string;
}
