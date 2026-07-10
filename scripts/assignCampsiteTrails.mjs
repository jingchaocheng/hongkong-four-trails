/**
 * 按与各径 GPX 轨迹的最短距离标注 trailIds（可属多条径）。
 * 阈值与规划器「附近露营点」筛选一致：5km。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const NEAR_TRAIL_KM = 5

const TRAIL_IDS = ['maclehose', 'wilson', 'hongkong', 'lantau']

/** 额外确保归入的径（营地 id -> 要追加的 trailId 列表） */
const MANUAL_ADD_TRAILS = {
  // 铅矿坳：麦理浩径地标营地
  '84049139': ['maclehose'],
  // 东龙洲：离岛，自动标注可能够不到，归入卫奕信径（西贡方向）
  '84049185': ['wilson'],
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function parseGpxTrack(xml) {
  const points = []
  const trkptRe = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g
  let m
  while ((m = trkptRe.exec(xml)) !== null) {
    points.push([Number(m[1]), Number(m[2])])
  }
  return points
}

function minDistToTrack(lat, lng, track) {
  let best = Infinity
  for (const [tlat, tlng] of track) {
    const d = haversine(lat, lng, tlat, tlng)
    if (d < best) best = d
  }
  return best
}

const tracks = Object.fromEntries(
  TRAIL_IDS.map((id) => {
    const xml = fs.readFileSync(path.join(root, 'src/data/gpx', `${id}.gpx`), 'utf8')
    return [id, parseGpxTrack(xml)]
  })
)

const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/mapGovPoints.json'), 'utf8'))

const multiTrail = []

data.points = data.points.map((p) => {
  const dists = Object.fromEntries(
    TRAIL_IDS.map((id) => [id, minDistToTrack(p.lat, p.lng, tracks[id])])
  )

  const trailIds = TRAIL_IDS.filter((id) => dists[id] <= NEAR_TRAIL_KM)

  for (const id of MANUAL_ADD_TRAILS[p.id] ?? []) {
    if (!trailIds.includes(id)) trailIds.push(id)
  }

  trailIds.sort()

  if (trailIds.length > 1) {
    multiTrail.push({
      name: p.name,
      trailIds,
      dists: Object.fromEntries(
        trailIds.map((id) => [id, Number(dists[id].toFixed(2))])
      ),
    })
  }

  const { trailId: _removed, ...rest } = p
  return { ...rest, trailIds }
})

delete data.trailCounts

fs.writeFileSync(
  path.join(root, 'src/data/mapGovPoints.json'),
  JSON.stringify(data, null, 2) + '\n',
  'utf8'
)

const counts = Object.fromEntries(
  TRAIL_IDS.map((id) => [id, data.points.filter((p) => p.trailIds.includes(id)).length])
)

console.log(`Updated mapGovPoints.json (threshold ${NEAR_TRAIL_KM}km)`)
console.log('Per-trail counts (may overlap):', counts)
console.log(`Multi-trail campsites: ${multiTrail.length}`)
multiTrail.forEach((c) => console.log(`  ${c.name}: ${c.trailIds.join(' + ')}`, c.dists))

const none = data.points.filter((p) => p.trailIds.length === 0)
if (none.length > 0) {
  console.log(`\nNo trail within ${NEAR_TRAIL_KM}km (${none.length}, only in「显示全部」):`)
  none.forEach((p) => console.log(`  ${p.name}`))
}
