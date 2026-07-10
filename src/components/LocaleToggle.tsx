import { useLocale, type Locale } from '../i18n/LocaleContext'

const LOCALE_LABELS: Record<Locale, string> = {
  'zh-Hans': '简体',
  'zh-Hant': '繁體',
}

export default function LocaleToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  const options: Locale[] = ['zh-Hans', 'zh-Hant']

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-gray-200 bg-white/95 p-0.5 text-xs shadow-sm ${className}`}
      role="group"
      aria-label="语言"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLocale(opt)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            locale === opt
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {LOCALE_LABELS[opt]}
        </button>
      ))}
    </div>
  )
}
