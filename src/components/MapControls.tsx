import { DayPath } from './ItineraryPlanner'
import { DayPathLegend } from './MapLegend'
import { useLocale } from '../i18n/LocaleContext'

interface MapControlsProps {
  dayPaths?: DayPath[]
  showAllCampsites: boolean
  onShowAllCampsitesChange: (value: boolean) => void
}

export function MapControls({
  dayPaths,
  showAllCampsites,
  onShowAllCampsitesChange,
}: MapControlsProps) {
  const { t } = useLocale()

  return (
    <div className="map-overlays pointer-events-none">
      {dayPaths && dayPaths.length > 0 && <DayPathLegend dayPaths={dayPaths} />}
      <div className="map-campsite-toggle pointer-events-auto">
        <label className="map-campsite-toggle-label">
          <input
            type="checkbox"
            checked={showAllCampsites}
            onChange={(e) => onShowAllCampsitesChange(e.target.checked)}
          />
          <span>{t('map.showAllCampsites')}</span>
        </label>
      </div>
    </div>
  )
}
