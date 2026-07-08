import { parseGPX, GPXData } from './gpxParser'

const TRAIL_GPX_LOADERS: Record<string, () => Promise<string>> = {
  maclehose: () => import('../data/gpx/maclehose.gpx?raw').then((m) => m.default),
  wilson: () => import('../data/gpx/wilson.gpx?raw').then((m) => m.default),
  hongkong: () => import('../data/gpx/hongkong.gpx?raw').then((m) => m.default),
  lantau: () => import('../data/gpx/lantau.gpx?raw').then((m) => m.default),
}

// 各路线全部轨迹点的海拔（与 gpxToTrackPoints 顺序对齐），用于精确爬升计算
const TRAIL_ELEVATION_LOADERS: Record<string, () => Promise<number[]>> = {
  maclehose: () => import('../data/elevation/maclehose.json').then((m) => m.default),
  wilson: () => import('../data/elevation/wilson.json').then((m) => m.default),
  hongkong: () => import('../data/elevation/hongkong.json').then((m) => m.default),
  lantau: () => import('../data/elevation/lantau.json').then((m) => m.default),
}

export const TRAIL_GPX_IDS = Object.keys(TRAIL_GPX_LOADERS)

export async function loadTrailElevations(trailId: string): Promise<number[]> {
  const loader = TRAIL_ELEVATION_LOADERS[trailId]
  if (!loader) return []
  try {
    return await loader()
  } catch {
    return []
  }
}

export function hasTrailGpx(trailId: string): boolean {
  return trailId in TRAIL_GPX_LOADERS
}

export async function loadTrailGpx(trailId: string): Promise<GPXData | null> {
  const loader = TRAIL_GPX_LOADERS[trailId]
  if (!loader) return null

  const content = await loader()
  return parseGPX(content)
}

export function gpxToTrackPoints(gpxData: GPXData): Array<[number, number]> {
  if (gpxData.tracks.length === 0 || gpxData.tracks[0].points.length === 0) {
    return []
  }
  return gpxData.tracks[0].points.map((p) => [p.lat, p.lng] as [number, number])
}
