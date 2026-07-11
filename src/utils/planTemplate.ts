import type { Locale } from '../i18n/LocaleContext'
import { getMessages } from '../i18n/LocaleContext'
import { localizeContent } from '../i18n/localeText'

export interface PlanDaySupply {
  name: string
  typesLabel: string
  nearMarker?: string
  note?: string
}

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
  supplyPoints?: PlanDaySupply[]
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

/** 手机窄屏友好：短分隔线 */
const RULE = '════════════'
const DAY_RULE = '────────────'

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
    RULE,
    `  🏔️ ${t(locale, 'plan.title', { name: title })}`,
    `  📅 ${t(locale, 'plan.generated', { date: formatDate() })}`,
    RULE,
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
    lines.push(DAY_RULE)
    lines.push(`🌤️ ${t(locale, 'plan.dayHeader', { n: day.day })}`)
    lines.push(DAY_RULE)
    lines.push(`🚩 ${t(locale, 'plan.start', { label: day.startLabel })}`)
    lines.push(`🏁 ${t(locale, 'plan.end', { label: day.endLabel })}`)
    lines.push(`📏 ${t(locale, 'plan.distance', { n: day.distance.toFixed(1) })}`)
    lines.push(`⛰️ ${t(locale, 'plan.elevation', { n: Math.round(day.elevation) })}`)
    lines.push(`📍 ${t(locale, 'plan.markers', { n: day.markerCount })}`)
    if (day.supplyPoints && day.supplyPoints.length > 0) {
      lines.push(`🛒 ${t(locale, 'plan.supplyHeader')}`)
      day.supplyPoints.forEach((sp, idx) => {
        const name = localizeContent(sp.name, locale, 'simplified')
        const near = sp.nearMarker ? `（${sp.nearMarker}）` : ''
        const note = sp.note
          ? `（${localizeContent(sp.note, locale, 'simplified')}）`
          : ''
        lines.push(
          `   ${idx + 1}. ${name}${near} · ${sp.typesLabel}${note ? ` ${note}` : ''}`
        )
      })
    }
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

  lines.push(DAY_RULE)
  lines.push(`🥾 ${t(locale, 'plan.footerWish')}`)
  lines.push(`⚠️ ${t(locale, 'plan.footerSafety')}`)
  lines.push(`🌿 ${t(locale, 'plan.footerLeaveNoTrace')}`)
  lines.push('')

  return lines.join('\n')
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(
  value: string | number,
  type: 'String' | 'Number' = 'String',
  styleId?: string
): string {
  const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : ''
  if (type === 'Number' && typeof value === 'number') {
    return `<Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>`
  }
  return `<Cell${styleAttr}><Data ss:Type="String">${escXml(String(value))}</Data></Cell>`
}

function row(cells: string[]): string {
  return `<Row>${cells.join('')}</Row>`
}

/** 生成可被 Excel 直接打开的 SpreadsheetML（.xls） */
export function formatPlanExcelXml(
  input: PlanTemplateInput,
  locale: Locale = 'zh-Hans'
): string {
  const headers = [
    t(locale, 'plan.excelColDay'),
    t(locale, 'plan.excelColStart'),
    t(locale, 'plan.excelColEnd'),
    t(locale, 'plan.excelColDistance'),
    t(locale, 'plan.excelColElevation'),
    t(locale, 'plan.excelColMarkers'),
    t(locale, 'plan.excelColSupply'),
    t(locale, 'plan.excelColCampsite'),
    t(locale, 'plan.excelColCampsiteAddr'),
    t(locale, 'plan.excelColWater'),
    t(locale, 'plan.excelColSanitary'),
  ]

  const dayRows = input.days.map((day) => {
    const supplyText = (day.supplyPoints ?? [])
      .map((sp, idx) => {
        const name = localizeContent(sp.name, locale, 'simplified')
        const near = sp.nearMarker ? `（${sp.nearMarker}）` : ''
        const note = sp.note
          ? `（${localizeContent(sp.note, locale, 'simplified')}）`
          : ''
        return `${idx + 1}. ${name}${near} · ${sp.typesLabel}${note ? ` ${note}` : ''}`
      })
      .join('\n')

    return row([
      cell(day.day, 'Number'),
      cell(day.startLabel),
      cell(day.endLabel),
      cell(Number(day.distance.toFixed(1)), 'Number'),
      cell(Math.round(day.elevation), 'Number'),
      cell(day.markerCount, 'Number'),
      cell(supplyText, 'String', 'Wrap'),
      cell(
        day.campsiteName
          ? localizeContent(day.campsiteName, locale, 'traditional')
          : ''
      ),
      cell(
        day.campsiteAddress
          ? localizeContent(day.campsiteAddress, locale, 'traditional')
          : ''
      ),
      cell(
        day.campsiteWaterSource
          ? localizeContent(day.campsiteWaterSource, locale, 'simplified')
          : ''
      ),
      cell(
        day.campsiteSanitary
          ? localizeContent(day.campsiteSanitary, locale, 'simplified')
          : ''
      ),
    ])
  })

  // 仅每日行程表（不含概况）
  const allRows = [
    row(
      headers.map(
        (h) =>
          `<Cell ss:StyleID="Header"><Data ss:Type="String">${escXml(h)}</Data></Cell>`
      )
    ),
    ...dayRows,
  ]

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="Wrap">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escXml(t(locale, 'plan.excelSheetDays'))}">
  <Table>
${allRows.join('\n')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`
}

export function downloadPlanExcel(
  input: PlanTemplateInput,
  locale: Locale = 'zh-Hans'
): void {
  const xml = formatPlanExcelXml(input, locale)
  // BOM 便于 Excel 正确识别中文
  const blob = new Blob(['\uFEFF' + xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = (input.trailName || 'plan').replace(/[\\/:*?"<>|]/g, '_')
  a.href = url
  a.download = `${safeName}-行程计划.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
