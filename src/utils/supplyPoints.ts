import supplyData from '../data/supplyPoints.json'

export type SupplyType = 'store' | 'water' | 'toilet'

export const SUPPLY_TYPES: SupplyType[] = ['store', 'water', 'toilet']

export interface SupplyPoint {
  id: string
  name: string
  /** 同一地点可有多种设施 */
  types: SupplyType[]
  lat: number
  lng: number
  trailIds: string[]
  nearMarker?: string
  note?: string
  /** repo = 仓库数据；draft = 本地标注未写入仓库 */
  source?: 'repo' | 'draft'
}

/** 兼容旧数据：单 type 字段 */
type RawSupplyPoint = Omit<SupplyPoint, 'source' | 'types'> & {
  types?: SupplyType[]
  type?: SupplyType
}

export interface SupplyPointsFile {
  generatedAt: string
  points: Omit<SupplyPoint, 'source'>[]
}

const DRAFT_STORAGE_KEY = 'hk-four-trails-supply-drafts-v2'

function normalizeTypes(raw: RawSupplyPoint): SupplyType[] {
  const fromArray = (raw.types ?? []).filter((t): t is SupplyType =>
    SUPPLY_TYPES.includes(t)
  )
  if (fromArray.length > 0) return [...new Set(fromArray)]
  if (raw.type && SUPPLY_TYPES.includes(raw.type)) return [raw.type]
  return ['store']
}

function normalizePoint(raw: RawSupplyPoint, source: 'repo' | 'draft'): SupplyPoint {
  const { type: _legacy, types: _t, ...rest } = raw
  return {
    ...rest,
    types: normalizeTypes(raw),
    source,
  }
}

const repoPoints: SupplyPoint[] = (supplyData.points as RawSupplyPoint[]).map((p) =>
  normalizePoint(p, 'repo')
)

function readDrafts(): SupplyPoint[] {
  if (typeof localStorage === 'undefined') return []
  try {
    // 兼容旧草稿 key
    const raw =
      localStorage.getItem(DRAFT_STORAGE_KEY) ??
      localStorage.getItem('hk-four-trails-supply-drafts')
    if (!raw) return []
    const parsed = JSON.parse(raw) as RawSupplyPoint[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((p) => normalizePoint(p, 'draft'))
  } catch {
    return []
  }
}

function writeDrafts(drafts: SupplyPoint[]): void {
  const payload = drafts.map(({ source: _s, ...rest }) => rest)
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
}

export function getRepoSupplyPoints(): SupplyPoint[] {
  return repoPoints
}

export function getDraftSupplyPoints(): SupplyPoint[] {
  return readDrafts()
}

/** 仓库点 + 本地草稿（同 id 时草稿覆盖） */
export function getAllSupplyPoints(): SupplyPoint[] {
  const drafts = readDrafts()
  const draftIds = new Set(drafts.map((p) => p.id))
  return [...repoPoints.filter((p) => !draftIds.has(p.id)), ...drafts]
}

export function getSupplyPointsForTrail(trailId: string): SupplyPoint[] {
  return getAllSupplyPoints().filter(
    (p) => p.trailIds.length === 0 || p.trailIds.includes(trailId)
  )
}

export interface SupplyAlongPath extends SupplyPoint {
  /** 沿路径最近点的下标，用于排序 */
  pathIndex: number
  distanceKm: number
}

/** 找出距某段路径不超过 maxKm 的补给点，按途经顺序排列 */
export function findSupplyPointsAlongPath(
  positions: Array<[number, number]>,
  trailId: string,
  maxKm = 0.45
): SupplyAlongPath[] {
  if (positions.length === 0) return []
  const candidates = getSupplyPointsForTrail(trailId)
  const hit: SupplyAlongPath[] = []

  for (const point of candidates) {
    let bestD = Infinity
    let bestI = 0
    // 路径点可能很多，步长抽样 + 邻域精修
    const step = Math.max(1, Math.floor(positions.length / 400))
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

export function addDraftSupplyPoint(
  point: Omit<SupplyPoint, 'source' | 'id'> & { id?: string }
): SupplyPoint {
  const drafts = readDrafts()
  const types = [...new Set(point.types)]
  const next: SupplyPoint = {
    ...point,
    types: types.length > 0 ? types : ['store'],
    id: point.id ?? `draft-${Date.now()}`,
    source: 'draft',
  }
  drafts.push(next)
  writeDrafts(drafts)
  return next
}

export function removeDraftSupplyPoint(id: string): void {
  writeDrafts(readDrafts().filter((p) => p.id !== id))
}

export function clearDraftSupplyPoints(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
  localStorage.removeItem('hk-four-trails-supply-drafts')
}

/** 导出可粘贴进 supplyPoints.json 的完整文件内容（仓库 + 草稿合并） */
export function buildSupplyPointsExport(): SupplyPointsFile {
  const merged = getAllSupplyPoints().map(({ source: _s, ...rest }) => rest)
  return {
    generatedAt: new Date().toISOString(),
    points: merged,
  }
}

export function exportSupplyPointsJson(): string {
  return JSON.stringify(buildSupplyPointsExport(), null, 2) + '\n'
}

export async function copySupplyPointsJson(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(exportSupplyPointsJson())
    return true
  } catch {
    return false
  }
}

export function downloadSupplyPointsJson(filename = 'supplyPoints.json'): void {
  const blob = new Blob([exportSupplyPointsJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 找最近标距柱编号 */
export function findNearestMarkerId(
  lat: number,
  lng: number,
  markers: Array<{ id: string; lat: number; lng: number }>,
  maxKm = 2
): string | undefined {
  let bestId: string | undefined
  let best = Infinity
  for (const m of markers) {
    const d = haversineKm(lat, lng, m.lat, m.lng)
    if (d < best) {
      best = d
      bestId = m.id
    }
  }
  return best <= maxKm ? bestId : undefined
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

export function supplyTypeLabelKey(type: SupplyType): `supply.${SupplyType}` {
  return `supply.${type}`
}

/** 手工补给点地图图标统一为「补」+ 同色 */
export function supplyIconStyle(_types: SupplyType[]): { bg: string; glyph: string } {
  return { bg: '#7c3aed', glyph: '补' }
}
