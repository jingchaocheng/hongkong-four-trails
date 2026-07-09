import * as OpenCC from 'opencc-js'

const converter = OpenCC.Converter({ from: 'hk', to: 'cn' })

/** 香港繁体 → 大陆简体，用于界面统一显示 */
export function toZhHans(text: string): string {
  if (!text) return text
  return converter(text)
}
