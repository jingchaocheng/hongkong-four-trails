import { CountryParkToilet } from '../utils/toilets'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'

interface ToiletPopupProps {
  point: CountryParkToilet
}

export default function ToiletPopup({ point }: ToiletPopupProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()

  return (
    <div className="supply-popup">
      <strong className="text-sm text-gray-900">{lc(point.name, 'simplified')}</strong>
      <p className="mt-1 text-xs text-gray-500">{t('toilet.badge')}</p>
      {point.countryPark && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.countryPark, 'simplified')}</p>
      )}
      {point.toiletType && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.toiletType, 'simplified')}</p>
      )}
      {point.barrierFree && (
        <p className="mt-1 text-xs text-gray-600">{t('toilet.barrierFree')}</p>
      )}
    </div>
  )
}
