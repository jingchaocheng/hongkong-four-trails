import type { Locale } from '../i18n/LocaleContext'
import { getMessages } from '../i18n/LocaleContext'
import { localizeContent } from '../i18n/localeText'

export interface PlanDaySummary {
  day: number
  startLabel: string
  endLabel: string
  distance: number
  elevation: number
  markerCount: number
  campsiteName?: string
  campsiteAddress?: string
  campsiteWaterSource?: string
  campsiteSanitary?: string
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

function t(
  locale: Locale,
  path: string,
  params?: Record<string, string | number>
): string {
  const messages = getMessages(locale)
  const raw = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, messages)
  if (typeof raw !== 'string') return path
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  )
}

export function formatPlanTemplate(
  input: PlanTemplateInput,
  locale: Locale = 'zh-Hans'
): string {
  const title = input.trailNameEn
    ? `${input.trailName} ${input.trailNameEn}`
    : input.trailName

  const directionLabel = input.loopMode
    ? t(locale, 'plan.dirLoop')
    : input.reverse
      ? t(locale, 'plan.dirReverse')
      : t(locale, 'plan.dirForward')

  const lines: string[] = [
    '══════════════════════════════════════',
    `  🏔️ ${t(locale, 'plan.title', { name: title })}`,
    `  📅 ${t(locale, 'plan.generated', { date: formatDate() })}`,
    '══════════════════════════════════════',
    '',
    `📋 ${t(locale, 'plan.overview')}`,
    `🗺️ ${t(locale, 'plan.route', { desc: input.routeDescription })}`,
    `🧭 ${t(locale, 'plan.direction', { dir: directionLabel })}`,
    `📆 ${t(locale, 'plan.days', { n: input.numDays })}`,
    `📏 ${t(locale, 'plan.totalDistance', { n: input.totalDistance.toFixed(1) })}`,
    `⛰️ ${t(locale, 'plan.totalElevation', { n: Math.round(input.totalElevation) })}`,
    '',
  ]

  input.days.forEach((day) => {
    lines.push('──────────────────────────────────────')
    lines.push(`🌤️ ${t(locale, 'plan.dayHeader', { n: day.day })}`)
    lines.push('──────────────────────────────────────')
    lines.push(`🚩 ${t(locale, 'plan.start', { label: day.startLabel })}`)
    lines.push(`🏁 ${t(locale, 'plan.end', { label: day.endLabel })}`)
    lines.push(`📏 ${t(locale, 'plan.distance', { n: day.distance.toFixed(1) })}`)
    lines.push(`⛰️ ${t(locale, 'plan.elevation', { n: Math.round(day.elevation) })}`)
    lines.push(`📍 ${t(locale, 'plan.markers', { n: day.markerCount })}`)
    if (day.campsiteName) {
      lines.push(
        `⛺ ${t(locale, 'plan.campsite', {
          name: localizeContent(day.campsiteName, locale, 'traditional'),
        })}`
      )
      if (day.campsiteAddress) {
        lines.push(
          `📌 ${t(locale, 'plan.campsiteLocation', {
            addr: localizeContent(day.campsiteAddress, locale, 'traditional'),
          })}`
        )
      }
      if (day.campsiteWaterSource) {
        lines.push(
          `💧 ${t(locale, 'plan.water', {
            text: localizeContent(day.campsiteWaterSource, locale, 'simplified'),
          })}`
        )
      }
      if (day.campsiteSanitary) {
        lines.push(
          `🚻 ${t(locale, 'plan.sanitary', {
            text: localizeContent(day.campsiteSanitary, locale, 'simplified'),
          })}`
        )
      }
    }
    lines.push('')
  })

  lines.push('──────────────────────────────────────')
  lines.push(`🥾 ${t(locale, 'plan.footerWish')}`)
  lines.push(`⚠️ ${t(locale, 'plan.footerSafety')}`)
  lines.push(`🌿 ${t(locale, 'plan.footerLeaveNoTrace')}`)
  lines.push('')

  return lines.join('\n')
}
