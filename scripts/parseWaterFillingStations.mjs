// 解析郊野公园加水站 CSV → src/data/waterDispensers.json
// 用法: node scripts/parseWaterFillingStations.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import proj4 from 'proj4'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(
  __dirname,
  '..',
  'src',
  'data',
  'csv',
  'Water_Filling_Station_WaterFillingStation_Ext__WaterFillingStation_WaterFillingStation_Ext_GDB_converted.csv'
)
const outPath = path.join(__dirname, '..', 'src', 'data', 'waterDispensers.json')

// Hong Kong 1980 Grid (EPSG:2326) → WGS84
// 参数来源：地政总署测绘处官方 7 参数（与 geodetic.gov.hk 一致）
const HK80GRID =
  '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs'
const WGS84 = 'EPSG:4326'

function gridToLatLng(easting, northing) {
  const [lng, lat] = proj4(HK80GRID, WGS84, [easting, northing])
  return { lat, lng }
}

function isValidHkCoord(lat, lng) {
  return lat >= 22.1 && lat <= 22.58 && lng >= 113.85 && lng <= 114.55
}

/** 简易 CSV 行解析（支持引号内逗号） */
function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields.map((f) => f.trim())
}

const raw = fs.readFileSync(csvPath, 'utf8')
const lines = raw.split(/\r?\n/).filter((l) => l.trim())
const header = parseCsvLine(lines[0])

const col = (name) => header.indexOf(name)

const points = []
let skipped = 0

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i])
  if (cols.length < header.length) {
    skipped++
    continue
  }

  const easting = parseFloat(cols[col('GeometryEasting')])
  const northing = parseFloat(cols[col('GeometryNorthing')])
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    skipped++
    continue
  }

  const { lat, lng } = gridToLatLng(easting, northing)
  if (!isValidHkCoord(lat, lng)) {
    skipped++
    continue
  }

  const facId = cols[col('FAC_ID')]
  const facilityTc = cols[col('FACILITY_NAME_TC')]
  const locationTc = cols[col('LOCATION_TC')]
  const name = facilityTc || locationTc || facId

  points.push({
    id: `wfs-${facId.replace(/\//g, '-').toLowerCase()}`,
    facId,
    name,
    facility: facilityTc,
    location: locationTc || undefined,
    countryPark: cols[col('COUNTRY_PARK_TC')] || undefined,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    dispenserType: cols[col('TYPE_OF_WATER_DISPENSER_TC')] || undefined,
    serviceHour: cols[col('SERVICE_HOUR')] || undefined,
    venueType: cols[col('TYPE_OF_VENUE_TC')] || undefined,
    waterTemp: cols[col('WATER_TEMPERATURE_TC')] || undefined,
  })
}

const out = {
  source: '渔农自然护理署郊野公园加水站',
  sourceFile:
    'Water_Filling_Station_WaterFillingStation_Ext__WaterFillingStation_WaterFillingStation_Ext_GDB_converted.csv',
  generatedAt: new Date().toISOString(),
  total: points.length,
  skipped,
  points,
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`已写入 ${points.length} 个加水站（跳过 ${skipped} 条）→ ${outPath}`)
