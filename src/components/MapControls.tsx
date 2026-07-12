import { useState } from 'react'
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
  showLcsdWater?: boolean
  onShowLcsdWaterChange?: (value: boolean) => void
  lcsdWaterCount?: number
  showSupplyPoints?: boolean
  onShowSupplyPointsChange?: (value: boolean) => void
  supplyPointCount?: number
  focusedDay?: number | null
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
  showLcsdWater = true,
  onShowLcsdWaterChange,
  lcsdWaterCount = 0,
  showSupplyPoints = true,
  onShowSupplyPointsChange,
  supplyPointCount = 0,
  focusedDay = null,
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
  // 移动端默认收起，避免挡住地图
  const [layersOpen, setLayersOpen] = useState(false)

  return (
    <div className={`map-overlays pointer-events-none${layersOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="map-overlays-toggle pointer-events-auto md:hidden"
        onClick={() => setLayersOpen((v) => !v)}
        aria-expanded={layersOpen}
      >
        <span>{layersOpen ? t('map.hideLayers') : t('map.showLayers')}</span>
        <svg
          className={`map-overlays-toggle-icon${layersOpen ? ' is-open' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className={`map-overlays-panel${layersOpen ? '' : ' max-md:hidden'}`}>
        {dayPaths && dayPaths.length > 0 && <DayPathLegend dayPaths={dayPaths} />}
        {focusedDay != null && (
          <p className="map-campsite-toggle-hint pointer-events-auto">
            {t('map.dayFocusHint', { n: focusedDay })}
          </p>
        )}
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

        {onShowLcsdWaterChange && (
          <div className="map-campsite-toggle pointer-events-auto">
            <label className="map-campsite-toggle-label">
              <input
                type="checkbox"
                checked={showLcsdWater}
                onChange={(e) => onShowLcsdWaterChange(e.target.checked)}
              />
              <span>
                {t('map.showLcsdWater')}
                {lcsdWaterCount > 0 ? ` (${lcsdWaterCount})` : ''}
              </span>
            </label>
            <p className="map-campsite-toggle-hint">{t('map.showLcsdWaterHint')}</p>
          </div>
        )}

        {onShowSupplyPointsChange && (
          <div className="map-campsite-toggle pointer-events-auto">
            <label className="map-campsite-toggle-label">
              <input
                type="checkbox"
                checked={showSupplyPoints}
                onChange={(e) => onShowSupplyPointsChange(e.target.checked)}
              />
              <span>
                {t('map.showSupplyPoints')}
                {supplyPointCount > 0 ? ` (${supplyPointCount})` : ''}
              </span>
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
    </div>
  )
}
