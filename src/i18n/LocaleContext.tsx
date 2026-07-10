import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { localizeContent } from './localeText'
import { uiMessages, messagesZhHant, type MessageTree } from './messages'

export type Locale = 'zh-Hans' | 'zh-Hant'

const STORAGE_KEY = 'hk-four-trails-locale'

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-Hans' || stored === 'zh-Hant') return stored
  } catch {
    // ignore
  }
  return 'zh-Hans'
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  )
}

type Messages = MessageTree

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, params?: Record<string, string | number>) => string
  messages: Messages
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function getByPath(obj: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
  return typeof value === 'string' ? value : undefined
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale)

  const messages = locale === 'zh-Hans' ? uiMessages : messagesZhHant

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    document.documentElement.lang = next === 'zh-Hans' ? 'zh-CN' : 'zh-HK'
  }, [])

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      const raw = getByPath(messages, path)
      if (!raw) return path
      return interpolate(raw, params)
    },
    [messages]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, messages }),
    [locale, setLocale, t, messages]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useLocalizedContent() {
  const { locale } = useLocale()
  return useCallback(
    (text: string, source: 'traditional' | 'simplified' = 'traditional') =>
      localizeContent(text, locale, source),
    [locale]
  )
}

export function getMessages(locale: Locale): Messages {
  return locale === 'zh-Hans' ? uiMessages : messagesZhHant
}
