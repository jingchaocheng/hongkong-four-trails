import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function haversineKm(a, b, c, d) {
  const R = 6371
  const t = (x) => (x * Math.PI) / 180
  const dLat = t(c - a)
  const dLng = t(d - b)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function normalize(s) {
  return String(s || '')
    .replace(/[()（）\s；;、·\-–—]/g, '')
    .replace(/廁所|厕所|公廁|公厕/g, '')
    .replace(/營地|营地|露營點|露营点/g, '')
    .replace(/郊野公園|郊野公园/g, '')
    .toLowerCase()
}

/** 营地旁厕所：名称对得上且距离足够近 */
export function findCampsiteToiletMatches(toilets, campsites) {
  const matches = []

  for (const toilet of toilets) {
    const tName = normalize(toilet.name)
    const toiletSaysCamp = /營地|营地/.test(toilet.name)
    let best = null

    for (const camp of campsites) {
      const cCore = normalize(camp.name)
      if (cCore.length < 2) continue
      const dist = haversineKm(toilet.lat, toilet.lng, camp.lat, camp.lng)
      const campLabel = String(camp.name || '').replace(/營地|营地/g, '')
      const nameHit =
        tName.includes(cCore) ||
        (campLabel.length >= 2 && String(toilet.name).includes(campLabel))
      const addr = normalize(camp.address || '')
      const addrHit = addr.length >= 2 && tName.includes(addr)

      // 名称明确指向营地：允许稍远（250m）；仅地址弱匹配：150m
      let maxKm = 0
      let reason = null
      if (nameHit && toiletSaysCamp) {
        maxKm = 0.25
        reason = 'camp-name'
      } else if (nameHit) {
        maxKm = 0.15
        reason = 'name'
      } else if (addrHit && toiletSaysCamp) {
        maxKm = 0.2
        reason = 'addr'
      }

      if (reason && dist <= maxKm && (!best || dist < best.dist)) {
        best = { camp, dist, reason }
      }
    }

    if (best) {
      matches.push({
        toiletId: toilet.id,
        toiletName: toilet.name,
        campsiteId: best.camp.id,
        campsiteName: best.camp.name,
        distM: Math.round(best.dist * 1000),
        reason: best.reason,
      })
    }
  }

  return matches
}

function loadCampsites() {
  const gov = JSON.parse(
    fs.readFileSync(path.join(root, 'src/data/mapGovPoints.json'), 'utf8')
  ).points
  // 与 campsites.ts EXTRA 保持一致（贝澳）
  const extra = [
    { id: 'extra-pui-o', name: '貝澳營地', address: '貝澳', lat: 22.23932, lng: 113.97771 },
  ]
  return [...gov, ...extra]
}

const toiletPath = path.join(root, 'src/data/toilets.json')
const toiletFile = JSON.parse(fs.readFileSync(toiletPath, 'utf8'))
const campsites = loadCampsites()
const matches = findCampsiteToiletMatches(toiletFile.points, campsites)
const matchIds = new Set(matches.map((m) => m.toiletId))

const annotated = toiletFile.points.map((p) => {
  const m = matches.find((x) => x.toiletId === p.id)
  if (!m) {
    const { atCampsite, campsiteId, campsiteName, ...rest } = p
    return rest
  }
  return {
    ...p,
    atCampsite: true,
    campsiteId: m.campsiteId,
    campsiteName: m.campsiteName,
  }
})

const out = {
  ...toiletFile,
  generatedAt: new Date().toISOString(),
  total: annotated.length,
  campsiteToiletCount: matches.length,
  points: annotated,
}

fs.writeFileSync(toiletPath, JSON.stringify(out, null, 2) + '\n')

matches.sort((a, b) => a.campsiteName.localeCompare(b.campsiteName, 'zh'))
console.log(`营地公厕（将不单独标注）: ${matches.length} / ${annotated.length}`)
for (const m of matches) {
  console.log(`  ${m.distM}m | ${m.toiletName} ↔ ${m.campsiteName}`)
}

const leftoverCampNamed = annotated.filter(
  (p) => !matchIds.has(p.id) && /營地|营地/.test(p.name)
)
if (leftoverCampNamed.length) {
  console.log(`\n名称含「营地」但未匹配到营地数据（仍显示）: ${leftoverCampNamed.length}`)
  leftoverCampNamed.forEach((p) => console.log(`  ${p.name}`))
}
