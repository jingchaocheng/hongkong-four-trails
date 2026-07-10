export interface TrailSection {
  section: number
  fromMarker: string
  toMarker: string
  route: string
  distanceKm: number
}

export interface TrailMarkerGuide {
  trailId: string
  markerPrefix: string
  markerRange: string
  markerCount: number
  spacingNote: string
  endpointNote: string
  sections: TrailSection[]
}

const TRAIL_MARKER_GUIDES: Record<string, TrailMarkerGuide> = {
  maclehose: {
    trailId: 'maclehose',
    markerPrefix: 'M',
    markerRange: 'M001–M200',
    markerCount: 200,
    spacingNote: '沿途约每 500 米设一支标距柱，编号自西向东递增（西贡北潭涌 → 屯门）。',
    endpointNote: '起点：北潭涌；终点：屯门（M200）。',
    sections: [
      { section: 1, fromMarker: 'M001', toMarker: 'M020', route: '北潭涌 → 浪茄', distanceKm: 10.6 },
      { section: 2, fromMarker: 'M021', toMarker: 'M048', route: '浪茄 → 北潭凹', distanceKm: 13.5 },
      { section: 3, fromMarker: 'M049', toMarker: 'M068', route: '北潭凹 → 企岭下', distanceKm: 10.2 },
      { section: 4, fromMarker: 'M069', toMarker: 'M093', route: '企岭下 → 大老山', distanceKm: 12.7 },
      { section: 5, fromMarker: 'M094', toMarker: 'M115', route: '大老山 → 大埔公路', distanceKm: 10.6 },
      { section: 6, fromMarker: 'M116', toMarker: 'M124', route: '大埔公路 → 城门', distanceKm: 4.6 },
      { section: 7, fromMarker: 'M125', toMarker: 'M137', route: '城门 → 铅矿坳', distanceKm: 6.2 },
      { section: 8, fromMarker: 'M138', toMarker: 'M156', route: '铅矿坳 → 荃锦公路', distanceKm: 9.7 },
      { section: 9, fromMarker: 'M157', toMarker: 'M168', route: '荃锦公路 → 田夫仔', distanceKm: 6.3 },
      { section: 10, fromMarker: 'M169', toMarker: 'M200', route: '田夫仔 → 屯门', distanceKm: 15.6 },
    ],
  },
  wilson: {
    trailId: 'wilson',
    markerPrefix: 'W',
    markerRange: 'W001–W137',
    markerCount: 137,
    spacingNote:
      '标距柱编号 W001–W137，间距并不均匀（平均约 550 米以上），遇险时可报编号协助搜救。',
    endpointNote: '起点：赤柱峡道；终点：南涌（屏南石涧一带，末柱为 W137）。',
    sections: [
      { section: 1, fromMarker: 'W001', toMarker: 'W008', route: '赤柱峡道 → 黄泥涌水塘', distanceKm: 4.8 },
      { section: 2, fromMarker: 'W009', toMarker: 'W018', route: '黄泥涌水塘 → 蓝田', distanceKm: 6.6 },
      { section: 3, fromMarker: 'W019', toMarker: 'W031', route: '蓝田 → 井栏树', distanceKm: 9.3 },
      { section: 4, fromMarker: 'W032', toMarker: 'W046', route: '井栏树 → 沙田坳', distanceKm: 8.0 },
      { section: 5, fromMarker: 'W047', toMarker: 'W060', route: '沙田坳 → 大埔公路', distanceKm: 7.4 },
      { section: 6, fromMarker: 'W061', toMarker: 'W069', route: '大埔公路 → 城门水塘', distanceKm: 5.3 },
      { section: 7, fromMarker: 'W070', toMarker: 'W088', route: '城门水塘 → 元墩下', distanceKm: 10.2 },
      { section: 8, fromMarker: 'W089', toMarker: 'W105', route: '元墩下 → 九龙坑山', distanceKm: 9.0 },
      { section: 9, fromMarker: 'W106', toMarker: 'W125', route: '九龙坑山 → 八仙岭', distanceKm: 10.6 },
      { section: 10, fromMarker: 'W126', toMarker: 'W137', route: '八仙岭 → 南涌', distanceKm: 6.8 },
    ],
  },
  hongkong: {
    trailId: 'hongkong',
    markerPrefix: 'H',
    markerRange: 'H001–H100',
    markerCount: 100,
    spacingNote: '沿途约每 500 米设一支标距柱，环绕港岛一周。',
    endpointNote: '起点：山顶（卢吉道一带）；终点：大浪湾。',
    sections: [
      { section: 1, fromMarker: 'H001', toMarker: 'H014', route: '山顶 → 薄扶林水塘', distanceKm: 7.0 },
      { section: 2, fromMarker: 'H015', toMarker: 'H025', route: '薄扶林水塘 → 贝璐道', distanceKm: 4.5 },
      { section: 3, fromMarker: 'H026', toMarker: 'H037', route: '贝璐道 → 湾仔峡', distanceKm: 6.5 },
      { section: 4, fromMarker: 'H038', toMarker: 'H050', route: '湾仔峡 → 黄泥涌峡', distanceKm: 7.5 },
      { section: 5, fromMarker: 'H051', toMarker: 'H059', route: '黄泥涌峡 → 柏架山道', distanceKm: 4.0 },
      { section: 6, fromMarker: 'H060', toMarker: 'H068', route: '柏架山道 → 大潭道', distanceKm: 4.5 },
      { section: 7, fromMarker: 'H069', toMarker: 'H084', route: '大潭道 → 土地湾', distanceKm: 7.5 },
      { section: 8, fromMarker: 'H085', toMarker: 'H100', route: '土地湾 → 大浪湾', distanceKm: 8.5 },
    ],
  },
  lantau: {
    trailId: 'lantau',
    markerPrefix: 'L',
    markerRange: 'L001–L139',
    markerCount: 139,
    spacingNote: '沿途约每 500 米设一支标距柱，环线径道，起终点均在梅窝一带。',
    endpointNote: '环线：以梅窝为起终点（L001 与 L139 均在梅窝段附近）。',
    sections: [
      { section: 1, fromMarker: 'L001', toMarker: 'L004', route: '梅窝 → 南山', distanceKm: 2.5 },
      { section: 2, fromMarker: 'L005', toMarker: 'L017', route: '南山 → 伯公坳', distanceKm: 6.5 },
      { section: 3, fromMarker: 'L018', toMarker: 'L027', route: '伯公坳 → 昂坪', distanceKm: 4.5 },
      { section: 4, fromMarker: 'L028', toMarker: 'L034', route: '昂坪 → 深屈道', distanceKm: 4.0 },
      { section: 5, fromMarker: 'L035', toMarker: 'L049', route: '深屈道 → 万丈布', distanceKm: 7.5 },
      { section: 6, fromMarker: 'L050', toMarker: 'L054', route: '万丈布 → 大澳', distanceKm: 2.5 },
      { section: 7, fromMarker: 'L055', toMarker: 'L076', route: '大澳 → 狗岭涌', distanceKm: 10.5 },
      { section: 8, fromMarker: 'L077', toMarker: 'L086', route: '狗岭涌 → 石壁水塘', distanceKm: 5.5 },
      { section: 9, fromMarker: 'L087', toMarker: 'L099', route: '石壁水塘 → 水口', distanceKm: 6.5 },
      { section: 10, fromMarker: 'L100', toMarker: 'L113', route: '水口 → 旧东涌道', distanceKm: 6.5 },
      { section: 11, fromMarker: 'L114', toMarker: 'L121', route: '旧东涌道 → 贝澳', distanceKm: 4.5 },
      { section: 12, fromMarker: 'L122', toMarker: 'L139', route: '贝澳 → 梅窝', distanceKm: 9.0 },
    ],
  },
}

export function getTrailMarkerGuide(trailId: string): TrailMarkerGuide | undefined {
  return TRAIL_MARKER_GUIDES[trailId]
}
