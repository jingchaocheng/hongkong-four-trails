import mapGovData from "../data/mapGovPoints.json";

export interface CampsiteDetailsZhHans {
  campLocationZhHans: string
  campTypeZhHans: string
  suitableForZhHans: string
  introZhHans: string
  facilitiesZhHans: string
  sanitaryFacilitiesZhHans: string
  waterSourceZhHans: string
  attractionsZhHans: string
  accessZhHans: string
  remarksZhHans: string
  sourceUrl: string
}

export interface Campsite {
  id: string;
  /** 距该径 GPX 轨迹 ≤5km 的径道 id，可有多条 */
  trailIds: string[];
  name: string;
  nameEn: string;
  address: string;
  lat: number;
  lng: number;
  faciType: string;
  detailsZhHans?: CampsiteDetailsZhHans;
}

// 政府地图未收录、无设施编号的补充露营点
const EXTRA_CAMPSITES: Campsite[] = [
  {
    id: "extra-pui-o",
    trailIds: ["lantau"],
    name: "貝澳營地",
    nameEn: "Pui O Campsite",
    address: "貝澳",
    lat: 22.23932,
    lng: 113.97771,
    faciType: "CAMPSITE",
  },
];

type RawCampsite = Omit<Campsite, "trailIds"> & {
  trailIds?: string[];
  trailId?: string;
};

function normalizeCampsite(raw: RawCampsite): Campsite {
  const trailIds =
    raw.trailIds && raw.trailIds.length > 0
      ? raw.trailIds
      : raw.trailId
        ? [raw.trailId]
        : [];
  const { trailId: _removed, ...rest } = raw;
  return { ...rest, trailIds };
}

const allCampsites: Campsite[] = [
  ...(mapGovData.points as RawCampsite[]).map(normalizeCampsite),
  ...EXTRA_CAMPSITES,
];

export function getAllCampsites(): Campsite[] {
  return allCampsites;
}

export function getCampsitesByTrail(trailId: string): Campsite[] {
  return allCampsites.filter((p) => p.trailIds.includes(trailId));
}

// 每天选定的宿营点（供地图高亮）
export interface SelectedCampsite {
  id: string;
  day: number;
  color: string;
}
