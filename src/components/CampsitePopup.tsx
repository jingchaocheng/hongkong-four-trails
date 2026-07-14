import { Campsite, CampsiteDetailsZhHans, SelectedCampsite } from '../utils/campsites'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'

interface CampsitePopupProps {
  campsite: Campsite
  selected?: SelectedCampsite
}

export default function CampsitePopup({ campsite, selected }: CampsitePopupProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()
  const details = campsite.detailsZhHans

  const detailRows: { key: keyof CampsiteDetailsZhHans; label: string }[] = [
    { key: 'campLocationZhHans', label: t('campsite.location') },
    { key: 'campTypeZhHans', label: t('campsite.type') },
    { key: 'suitableForZhHans', label: t('campsite.suitable') },
    { key: 'introZhHans', label: t('campsite.intro') },
    { key: 'facilitiesZhHans', label: t('campsite.facilities') },
    { key: 'sanitaryFacilitiesZhHans', label: t('campsite.sanitary') },
    { key: 'waterSourceZhHans', label: t('campsite.water') },
    { key: 'attractionsZhHans', label: t('campsite.attractions') },
    { key: 'accessZhHans', label: t('campsite.access') },
    { key: 'remarksZhHans', label: t('campsite.remarks') },
  ]

  return (
    <div className="campsite-popup">
      <div className="campsite-popup-header">
        <strong className="campsite-popup-title">
          ⛺ {lc(campsite.name, 'traditional')}
        </strong>
        {selected && (
          <p className="campsite-popup-day" style={{ color: selected.color }}>
            {t('campsite.dayCamp', { n: selected.day })}
          </p>
        )}
        {campsite.nameEn && <p className="campsite-popup-en">{campsite.nameEn}</p>}
      </div>

      {details ? (
        <dl className="campsite-popup-details">
          {detailRows.map(({ key, label }) => {
            const value = details[key]
            if (!value || key === 'sourceUrl') return null
            return (
              <div key={key} className="campsite-popup-row">
                <dt>{label}</dt>
                <dd>{lc(value, 'simplified')}</dd>
              </div>
            )
          })}
          {details.sourceUrl && (
            <p className="campsite-popup-source">
              <a href={details.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t('campsite.sourceLink')}
              </a>
            </p>
          )}
        </dl>
      ) : (
        campsite.address && (
          <p className="campsite-popup-address">
            {lc(campsite.address, 'traditional')}
          </p>
        )
      )}
    </div>
  )
}
