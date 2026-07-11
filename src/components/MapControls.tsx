import { DayPath } from './ItineraryPlanner'
import { DayPathLegend } from './MapLegend'
import { useLocale } from '../i18n/LocaleContext'
import { BasemapId, getAvailableBasemaps } from '../utils/mapBasemaps'

interface MapControlsProps {
  dayPaths?: DayPath[]
  basemapId: BasemapId
  onBasemapChange: (id: BasemapId) => void
  showAllCampsites?: boolean
  onShowAllCampsitesChange?: (value: boolean) => void
  annotateEnabled: boolean
  onAnnotateEnabledChange: (value: boolean) => void
  draftCount: number
  onExportJson: () => void
  onDownloadJson: () => void
  onClearDrafts: () => void
  exportStatus?: 'idle' | 'copied' | 'failed'
}

export function MapControls({
  dayPaths,
  basemapId,
  onBasemapChange,
  showAllCampsites = false,
  onShowAllCampsitesChange,
  annotateEnabled,
  onAnnotateEnabledChange,
  draftCount,
  onExportJson,
  onDownloadJson,
  onClearDrafts,
  exportStatus = 'idle',
}: MapControlsProps) {
  const { t } = useLocale()
  const basemaps = getAvailableBasemaps()

  return (
    <div className="map-overlays pointer-events-none">
      {dayPaths && dayPaths.length > 0 && <DayPathLegend dayPaths={dayPaths} />}
      <div className="map-campsite-toggle pointer-events-auto">
        <label className="map-basemap-label" htmlFor="map-basemap-select">
          <span>{t('map.basemap')}</span>
          <select
            id="map-basemap-select"
            className="map-basemap-select"
            value={basemapId}
            onChange={(e) => onBasemapChange(e.target.value as BasemapId)}
          >
            {basemaps.map((b) => (
              <option key={b.id} value={b.id}>
                {t(b.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <p className="map-campsite-toggle-hint">{t('map.basemapHint')}</p>
      </div>

      {onShowAllCampsitesChange && (
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
      )}

      <div className="map-campsite-toggle pointer-events-auto supply-annotate-panel">
        <p className="map-legend-title">{t('supply.annotate')}</p>
        <label className="map-campsite-toggle-label">
          <input
            type="checkbox"
            checked={annotateEnabled}
            onChange={(e) => onAnnotateEnabledChange(e.target.checked)}
          />
          <span>{t('supply.annotateToggle')}</span>
        </label>
        {annotateEnabled && (
          <p className="map-campsite-toggle-hint">{t('supply.annotateHint')}</p>
        )}
        {draftCount > 0 && (
          <p className="map-campsite-toggle-hint">{t('supply.draftCount', { n: draftCount })}</p>
        )}
        <div className="supply-export-row">
          <button type="button" className="supply-mode-btn" onClick={onExportJson}>
            {exportStatus === 'copied' ? t('supply.exportCopied') : t('supply.exportJson')}
          </button>
          <button type="button" className="supply-mode-btn" onClick={onDownloadJson}>
            {t('supply.exportDownload')}
          </button>
        </div>
        {draftCount > 0 && (
          <button type="button" className="supply-mode-btn supply-mode-btn-danger" onClick={onClearDrafts}>
            {t('supply.clearDrafts')}
          </button>
        )}
      </div>
    </div>
  )
}
