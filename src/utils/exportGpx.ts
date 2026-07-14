/** 行程规划导出 GPX（可供两步路等软件导入） */

export type GpxWaypointKind = 'endpoint' | 'campsite' | 'supply' | 'water' | 'toilet'

export interface GpxTrackDay {
  day: number
  name: string
  positions: Array<[number, number]>
  elevations?: number[]
}

export interface GpxWaypoint {
  name: string
  lat: number
  lng: number
  elevation?: number
  description?: string
}

/** 带分类的可勾选航点（导出预览用） */
export interface GpxExportWaypoint extends GpxWaypoint {
  id: string
  kind: GpxWaypointKind
  day?: number
}

export interface BuildPlanGpxInput {
  trailName: string
  days: GpxTrackDay[]
  waypoints?: GpxWaypoint[]
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 抽稀轨迹，返回抽稀后的点和下标（便于对齐海拔） */
export function downsampleTrackPositions(
  positions: Array<[number, number]>,
  maxPoints = 2500
): { positions: Array<[number, number]>; indices: number[] } {
  if (positions.length <= maxPoints) {
    return {
      positions,
      indices: positions.map((_, i) => i),
    }
  }
  const step = Math.ceil(positions.length / maxPoints)
  const out: Array<[number, number]> = []
  const indices: number[] = []
  for (let i = 0; i < positions.length; i += step) {
    out.push(positions[i])
    indices.push(i)
  }
  const lastIdx = positions.length - 1
  if (indices[indices.length - 1] !== lastIdx) {
    out.push(positions[lastIdx])
    indices.push(lastIdx)
  }
  return { positions: out, indices }
}

function formatTrkpt(lat: number, lng: number, ele?: number): string {
  if (ele != null && Number.isFinite(ele)) {
    return `<trkpt lat="${lat}" lon="${lng}"><ele>${ele.toFixed(1)}</ele></trkpt>`
  }
  return `<trkpt lat="${lat}" lon="${lng}"></trkpt>`
}

function formatWpt(w: GpxWaypoint): string {
  const parts = [
    `<wpt lat="${w.lat}" lon="${w.lng}">`,
    `<name>${escXml(w.name)}</name>`,
  ]
  if (w.elevation != null && Number.isFinite(w.elevation)) {
    parts.push(`<ele>${w.elevation.toFixed(1)}</ele>`)
  }
  if (w.description) {
    parts.push(`<desc>${escXml(w.description)}</desc>`)
  }
  parts.push('</wpt>')
  return parts.join('')
}

/** 去重航点（约 30m 内同名视为同一点） */
export function dedupeWaypoints(waypoints: GpxWaypoint[]): GpxWaypoint[] {
  const out: GpxWaypoint[] = []
  for (const w of waypoints) {
    const dup = out.some(
      (x) =>
        x.name === w.name &&
        Math.abs(x.lat - w.lat) < 0.0003 &&
        Math.abs(x.lng - w.lng) < 0.0003
    )
    if (!dup) out.push(w)
  }
  return out
}

export function countTrackPoints(days: GpxTrackDay[]): number {
  return days.reduce((sum, d) => {
    if (d.positions.length < 2) return sum
    return sum + downsampleTrackPositions(d.positions).positions.length
  }, 0)
}

export function buildPlanGpx(input: BuildPlanGpxInput): string {
  const created = new Date().toISOString()
  const wpts = dedupeWaypoints(input.waypoints ?? [])

  const trkBlocks = input.days
    .filter((d) => d.positions.length >= 2)
    .map((day) => {
      const { positions: pts, indices } = downsampleTrackPositions(day.positions)
      const elev = day.elevations
      const trkpts = pts
        .map((p, i) => {
          const srcIdx = indices[i]
          const ele =
            elev && srcIdx < elev.length && Number.isFinite(elev[srcIdx])
              ? elev[srcIdx]
              : undefined
          return formatTrkpt(p[0], p[1], ele)
        })
        .join('\n')

      return `<trk>
<name>${escXml(day.name)}</name>
<trkseg>
${trkpts}
</trkseg>
</trk>`
    })
    .join('\n')

  const wptBlock = wpts.map(formatWpt).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="hongkong-four-trails"
 xmlns="http://www.topografix.com/GPX/1/1"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
<metadata>
<name>${escXml(input.trailName)}</name>
<time>${created}</time>
</metadata>
${wptBlock}
${trkBlocks}
</gpx>
`
}

export function downloadPlanGpx(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/gpx+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.gpx') ? filename : `${filename}.gpx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
