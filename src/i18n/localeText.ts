import * as OpenCC from 'opencc-js'
import type { Locale } from './LocaleContext'

const toHans = OpenCC.Converter({ from: 'hk', to: 'cn' })
const toHant = OpenCC.Converter({ from: 'cn', to: 'hk' })

export type TextSource = 'traditional' | 'simplified'

/** 动态内容（地名、营地名等）按语言与源文字类型转换 */
export function localizeContent(
  text: string,
  locale: Locale,
  source: TextSource = 'traditional'
): string {
  if (!text) return text
  if (locale === 'zh-Hans') {
    return source === 'traditional' ? toHans(text) : text
  }
  return source === 'simplified' ? toHant(text) : text
}

/** @deprecated 使用 localizeContent(text, locale) */
export function toZhHans(text: string): string {
  return toHans(text)
}
