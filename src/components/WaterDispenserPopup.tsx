import { WaterDispenser } from '../utils/waterDispensers'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'

interface WaterDispenserPopupProps {
  point: WaterDispenser
}

export default function WaterDispenserPopup({ point }: WaterDispenserPopupProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()

  return (
    <div className="supply-popup">
      <strong className="text-sm text-gray-900">{lc(point.name, 'simplified')}</strong>
      <p className="mt-1 text-xs text-gray-500">{t('waterDispenser.badge')}</p>
      {point.location && point.location !== point.facility && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.location, 'simplified')}</p>
      )}
      {point.countryPark && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.countryPark, 'simplified')}</p>
      )}
      {point.dispenserType && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.dispenserType, 'simplified')}</p>
      )}
      {(point.waterTemp || point.venueType) && (
        <p className="mt-1 text-xs text-gray-600">
          {[point.waterTemp, point.venueType]
            .filter(Boolean)
            .map((v) => lc(v!, 'simplified'))
            .join(' · ')}
        </p>
      )}
      {point.serviceHour && (
        <p className="mt-1 text-xs text-gray-600">
          {t('waterDispenser.hours')}: {point.serviceHour}
        </p>
      )}
    </div>
  )
}
