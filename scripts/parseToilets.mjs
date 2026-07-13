// 解析郊野公园厕所 GeoJSON → src/data/toilets.json
// 用法: node scripts/parseToilets.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const geoPath = path.join(
  __dirname,
  '..',
  'src',
  'data',
  'geojson',
  'Toilets_Toilets_Ext_GDB_gdb_Toilets_Toilets_Ext_GDB_converted.geojson'
)
const outPath = path.join(__dirname, '..', 'src', 'data', 'toilets.json')

function isValidHkCoord(lat, lng) {
  return lat >= 22.1 && lat <= 22.58 && lng >= 113.85 && lng <= 114.55
}

const raw = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
const features = Array.isArray(raw.features) ? raw.features : []

const points = []
let skipped = 0

for (const feature of features) {
  const coords = feature?.geometry?.coordinates
  const props = feature?.properties ?? {}
  if (!Array.isArray(coords) || coords.length < 2) {
    skipped++
    continue
  }

  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isValidHkCoord(lat, lng)) {
    skipped++
    continue
  }

  const facId = String(props.FAC_ID ?? props.OBJECTID ?? points.length + 1)
  const name =
    props.FACILITY_NAME_TC ||
    props.FACILITY_NAME_EN ||
    facId

  points.push({
    id: `toilet-${facId.replace(/\//g, '-').toLowerCase()}`,
    facId,
    name,
    facility: props.FACILITY_NAME_TC || undefined,
    countryPark: props.COUNTRY_PARK_TC || undefined,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    toiletType: props.TYPE_TC || undefined,
    barrierFree: props.BARRIER_FREE_FAC === 'Y',
  })
}

const out = {
  source: '渔农自然护理署郊野公园厕所',
  sourceFile: path.basename(geoPath),
  generatedAt: new Date().toISOString(),
  total: points.length,
  skipped,
  points,
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`已写入 ${points.length} 个厕所（跳过 ${skipped} 条）→ ${outPath}`)
console.log('请再运行: node scripts/filterCampsiteToilets.mjs  （标记营地配套公厕）')
