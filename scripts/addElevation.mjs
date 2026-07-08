// 为每条路线抓取「全部轨迹点(trkpt)」的海拔，用于精确计算累计爬升。
// 数据源: Open Topo Data (SRTM 30m, 免费公共实例, 限 1 次/秒, 1000 次/天)。
// 产出:
//   1. src/data/elevation/{trailId}.json  —— 与轨迹点顺序对齐的海拔整数数组
//   2. 回写每个 <wpt> 的 <ele>（取最近轨迹点的海拔，保证与轨迹同源）
// 用法: node scripts/addElevation.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gpxDir = path.join(__dirname, '..', 'src', 'data', 'gpx')
const eleDir = path.join(__dirname, '..', 'src', 'data', 'elevation')

const BATCH = 100 // Open Topo Data 单次最多 100 个坐标
const DELAY = 1100 // >=1s，遵守公共实例限流

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchElevations(coords) {
  const out = []
  for (let i = 0; i < coords.length; i += BATCH) {
    const chunk = coords.slice(i, i + BATCH)
    const locs = chunk.map((c) => `${c.lat},${c.lng}`).join('|')
    const url = `https://api.opentopodata.org/v1/srtm30m?locations=${locs}`
    let ok = false
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        if (!Array.isArray(data.results)) throw new Error('bad response')
        out.push(...data.results.map((r) => (r.elevation == null ? 0 : r.elevation)))
        ok = true
      } catch (err) {
        process.stdout.write(`\n  重试 ${attempt + 1} @${i}: ${err.message}\n`)
        await sleep(2000 * (attempt + 1))
      }
    }
    if (!ok) throw new Error('高程 API 多次失败，已中止 @' + i)
    process.stdout.write(`\r  ${Math.min(i + BATCH, coords.length)}/${coords.length}`)
    await sleep(DELAY)
  }
  process.stdout.write('\n')
  return out
}

function parseCoords(content, tag) {
  const re = new RegExp(`<${tag}\\s+lat="([^"]+)"\\s+lon="([^"]+)"`, 'g')
  const coords = []
  let m
  while ((m = re.exec(content)) !== null) {
    coords.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) })
  }
  return coords
}

function nearestIndex(pt, track) {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < track.length; i++) {
    const dLat = track[i].lat - pt.lat
    const dLng = track[i].lng - pt.lng
    const d = dLat * dLat + dLng * dLng
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

async function processFile(file) {
  const trailId = file.replace(/\.gpx$/, '')
  const full = path.join(gpxDir, file)
  let content = fs.readFileSync(full, 'utf8')

  const trackCoords = parseCoords(content, 'trkpt')
  if (trackCoords.length === 0) {
    console.log(`${file}: 无 trkpt，跳过`)
    return
  }

  console.log(`${file}: 抓取 ${trackCoords.length} 个轨迹点海拔...`)
  const trackEle = (await fetchElevations(trackCoords)).map((e) => Math.round(e))

  fs.mkdirSync(eleDir, { recursive: true })
  fs.writeFileSync(path.join(eleDir, `${trailId}.json`), JSON.stringify(trackEle))

  // 用最近轨迹点回写 wpt 海拔（同源）
  let wptIdx = 0
  const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"\s*>([\s\S]*?)<\/wpt>/g
  content = content.replace(wptRegex, (whole, lat, lon, inner) => {
    const ni = nearestIndex({ lat: parseFloat(lat), lng: parseFloat(lon) }, trackCoords)
    const ele = trackEle[ni] ?? 0
    wptIdx++
    const innerNoEle = inner.replace(/<ele>[\s\S]*?<\/ele>/g, '')
    return `<wpt lat="${lat}" lon="${lon}">${innerNoEle}<ele>${ele}</ele></wpt>`
  })
  fs.writeFileSync(full, content, 'utf8')

  const min = Math.min(...trackEle)
  const max = Math.max(...trackEle)
  console.log(`${file}: 完成 (轨迹点海拔 ${min}~${max}m, 回写 ${wptIdx} 个标记点)`)
}

async function main() {
  const files = fs.readdirSync(gpxDir).filter((f) => f.endsWith('.gpx'))
  for (const file of files) {
    await processFile(file)
  }
  console.log('全部完成。')
}

main().catch((err) => {
  console.error('出错:', err.message)
  process.exit(1)
})
