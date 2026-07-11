import { SupplyPoint, supplyTypeLabelKey } from '../utils/supplyPoints'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'

interface SupplyPointPopupProps {
  point: SupplyPoint
  onDeleteDraft?: (id: string) => void
}

export default function SupplyPointPopup({ point, onDeleteDraft }: SupplyPointPopupProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()
  const typeLabels = point.types.map((type) => t(supplyTypeLabelKey(type))).join(' · ')

  return (
    <div className="supply-popup">
      <strong className="text-sm text-gray-900">{lc(point.name, 'simplified')}</strong>
      <p className="mt-1 text-xs text-gray-500">{typeLabels}</p>
      {point.nearMarker && (
        <p className="mt-1 text-xs text-gray-600">
          {t('supply.nearMarker')}: {point.nearMarker}
        </p>
      )}
      {point.note && (
        <p className="mt-1 text-xs text-gray-600">{lc(point.note, 'simplified')}</p>
      )}
      {point.source === 'draft' && (
        <p className="mt-1 text-xs text-amber-600">{t('supply.draftBadge')}</p>
      )}
      {point.source === 'draft' && onDeleteDraft && (
        <button
          type="button"
          className="mt-2 text-xs text-red-600 hover:text-red-700"
          onClick={() => onDeleteDraft(point.id)}
        >
          {t('supply.deleteDraft')}
        </button>
      )}
    </div>
  )
}
