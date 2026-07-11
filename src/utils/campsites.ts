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

// 政府地图未收录、无设施编号的补充露营点（康文署等）
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
    detailsZhHans: {
      campLocationZhHans: "大屿山贝澳泳滩旁",
      campTypeZhHans: "大型（54 个营位）",
      suitableForZhHans: "",
      introZhHans:
        "贝澳营地位于大屿山贝澳泳滩旁，内设营位、烧烤炉、营地办事处等设施。",
      facilitiesZhHans: "烧烤炉、凉亭、营地办事处",
      sanitaryFacilitiesZhHans: "洗手间及更衣室（与贝澳泳滩共用）",
      waterSourceZhHans: "",
      attractionsZhHans: "邻近贝澳泳滩",
      accessZhHans:
        "在梅窝渡轮码头乘搭 1 号或 4 号往塘福巴士，在杯澳公立学校下车（车程约 15 分钟）；或在东涌市中心乘搭 3M 号或 A35 号巴士，在杯澳公立学校下车（车程约 30 分钟）。",
      remarksZhHans:
        "营位数目：54 个。由康乐及文化事务署管理。营地逢星期二关闭进行清洁保养（公众假期除外）。",
      sourceUrl: "https://www.lcsd.gov.hk/tc/camp/campsites/p_ng_po.html",
    },
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
