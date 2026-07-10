import * as OpenCC from 'opencc-js'

const toHans = OpenCC.Converter({ from: 'hk', to: 'cn' })

/** @deprecated 使用 localizeContent(text, locale) from i18n/localeText */
export function toZhHans(text: string): string {
  if (!text) return text
  return toHans(text)
}

export { localizeContent, type TextSource } from '../i18n/localeText'
