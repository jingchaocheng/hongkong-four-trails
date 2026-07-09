import { Campsite, CampsiteDetailsZhHans, SelectedCampsite } from '../utils/campsites'
import { toZhHans } from '../utils/toZhHans'

const DETAIL_ROWS: { key: keyof CampsiteDetailsZhHans; label: string }[] = [
  { key: 'campLocationZhHans', label: '营地地点' },
  { key: 'campTypeZhHans', label: '营地类型' },
  { key: 'suitableForZhHans', label: '适合对象' },
  { key: 'introZhHans', label: '简介' },
  { key: 'facilitiesZhHans', label: '设施' },
  { key: 'sanitaryFacilitiesZhHans', label: '卫生设施' },
  { key: 'waterSourceZhHans', label: '水源' },
  { key: 'attractionsZhHans', label: '营地景点' },
  { key: 'accessZhHans', label: '前往方法' },
  { key: 'remarksZhHans', label: '备注' },
]

interface CampsitePopupProps {
  campsite: Campsite
  selected?: SelectedCampsite
}

export default function CampsitePopup({ campsite, selected }: CampsitePopupProps) {
  const details = campsite.detailsZhHans

  return (
    <div className="campsite-popup">
      <div className="campsite-popup-header">
        <strong className="text-base text-gray-900">⛺ {toZhHans(campsite.name)}</strong>
        {selected && (
          <p className="mt-1 text-sm font-semibold" style={{ color: selected.color }}>
            第 {selected.day} 天宿营地
          </p>
        )}
        {campsite.nameEn && <p className="mt-0.5 text-xs text-gray-500">{campsite.nameEn}</p>}
      </div>

      {details ? (
        <dl className="campsite-popup-details">
          {DETAIL_ROWS.map(({ key, label }) => {
            const value = details[key]
            if (!value || key === 'sourceUrl') return null
            return (
              <div key={key} className="campsite-popup-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            )
          })}
          {details.sourceUrl && (
            <p className="campsite-popup-source">
              <a href={details.sourceUrl} target="_blank" rel="noopener noreferrer">
                查看渔农自然护理署原文
              </a>
            </p>
          )}
        </dl>
      ) : (
        campsite.address && <p className="mt-2 text-sm text-gray-600">{toZhHans(campsite.address)}</p>
      )}
    </div>
  )
}
