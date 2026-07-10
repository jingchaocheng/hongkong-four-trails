import { localizeContent, type TextSource } from './localeText'
import type { Locale } from './LocaleContext'
import type { Trail } from '../data/trails'

export function localizeTrail(trail: Trail, locale: Locale) {
  return {
    ...trail,
    name: localizeContent(trail.name, locale, 'simplified'),
    location: localizeContent(trail.location, locale, 'simplified'),
    description: localizeContent(trail.description, locale, 'simplified'),
  }
}

export { localizeContent, type TextSource }
