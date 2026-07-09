import { toZhHans } from './toZhHans'

export interface PlanDaySummary {
  day: number
  startLabel: string
  endLabel: string
  distance: number
  elevation: number
  markerCount: number
  campsiteName?: string
  campsiteAddress?: string
}

export interface PlanTemplateInput {
  trailName: string
  trailNameEn?: string
  routeDescription: string
  reverse: boolean
  loopMode: boolean
  numDays: number
  totalDistance: number
  totalElevation: number
  days: PlanDaySummary[]
}

function formatDate(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatPlanTemplate(input: PlanTemplateInput): string {
  const title = input.trailNameEn
    ? `${input.trailName} ${input.trailNameEn}`
    : input.trailName

  const directionLabel = input.loopMode
    ? '🔄 环线'
    : input.reverse
      ? '⬅️ 反向'
      : '➡️ 正向'

  const lines: string[] = [
    '══════════════════════════════════════',
    `  🏔️ ${title} · 行程计划`,
    `  📅 生成于 ${formatDate()}`,
    '══════════════════════════════════════',
    '',
    '📋 【概况】',
    `🗺️ 路线：${input.routeDescription}`,
    `🧭 方向：${directionLabel}`,
    `📆 天数：${input.numDays} 天`,
    `📏 总距离：~${input.totalDistance.toFixed(1)} 公里`,
    `⛰️ 总爬升：${Math.round(input.totalElevation)} 米`,
    '',
  ]

  input.days.forEach((day) => {
    lines.push('──────────────────────────────────────')
    lines.push(`🌤️ 第 ${day.day} 天`)
    lines.push('──────────────────────────────────────')
    lines.push(`🚩 起点：${day.startLabel}`)
    lines.push(`🏁 终点：${day.endLabel}`)
    lines.push(`📏 距离：~${day.distance.toFixed(1)} 公里`)
    lines.push(`⛰️ 爬升：${Math.round(day.elevation)} 米`)
    lines.push(`📍 途经：${day.markerCount} 个标记点`)
    if (day.campsiteName) {
      lines.push(`⛺ 当晚露营：${toZhHans(day.campsiteName)}`)
      if (day.campsiteAddress) {
        lines.push(`📌 营地位置：${toZhHans(day.campsiteAddress)}`)
      }
    }
    lines.push('')
  })

  lines.push('──────────────────────────────────────')
  lines.push('🥾 祝徒步愉快！')
  lines.push('⚠️ 安全第一：量力而行，注意天气与补水，结伴而行更安心。')
  lines.push('')

  return lines.join('\n')
}
