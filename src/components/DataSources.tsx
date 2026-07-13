import { useLocale } from '../i18n/LocaleContext'

export const DATA_SOURCES = {
  campsites: [
    {
      nameKey: 'sources.afcd' as const,
      url: 'https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_cam/cou_vis_cam_cam/cou_vis_cam_cam.html',
    },
    {
      nameKey: 'sources.lcsd' as const,
      url: 'https://www.lcsd.gov.hk/tc/camp/campsites/p_ng_po.html',
    },
  ],
  tracks: [
    {
      nameKey: 'sources.hikingTrailHk' as const,
      url: 'https://hikingtrailhk.appspot.com/home.hk.html',
    },
  ],
  waterStations: [
    {
      nameKey: 'sources.afcd' as const,
      url: 'https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_rec/cou_vis_wfs.html',
    },
  ],
  toilets: [
    {
      nameKey: 'sources.afcd' as const,
      url: 'https://portal.csdi.gov.hk/geoportal/?lang=tc&datasetId=afcd_rcd_1634603765857_53282',
    },
  ],
}

interface DataSourcesProps {
  variant?: 'dark' | 'light'
  className?: string
}

function linkClass(isDark: boolean) {
  return isDark
    ? 'text-amber-200/80 hover:text-amber-100 underline-offset-2 hover:underline'
    : 'text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline'
}

function DataSources({ variant = 'dark', className = '' }: DataSourcesProps) {
  const { t } = useLocale()
  const isDark = variant === 'dark'
  const labelClass = isDark ? 'text-slate-500' : 'text-gray-400'
  const sepClass = isDark ? 'text-slate-600' : 'text-gray-300'

  return (
    <aside
      className={`data-sources data-sources-${variant} ${className}`.trim()}
      aria-label={t('sources.title')}
    >
      <p className={`data-sources-title ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {t('sources.title')}
      </p>
      <div className="data-sources-groups">
        <div className="data-sources-group">
          <span className={`data-sources-label ${labelClass}`}>{t('sources.campsites')}</span>
          <span className="data-sources-links">
            {DATA_SOURCES.campsites.map((item, i) => (
              <span key={item.url}>
                {i > 0 && <span className={sepClass}> · </span>}
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass(isDark)}>
                  {t(item.nameKey)}
                </a>
              </span>
            ))}
          </span>
        </div>
        <div className="data-sources-group">
          <span className={`data-sources-label ${labelClass}`}>{t('sources.tracks')}</span>
          <span className="data-sources-links">
            {DATA_SOURCES.tracks.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(isDark)}
              >
                {t(item.nameKey)}
              </a>
            ))}
          </span>
        </div>
        <div className="data-sources-group">
          <span className={`data-sources-label ${labelClass}`}>{t('sources.waterStations')}</span>
          <span className="data-sources-links">
            {DATA_SOURCES.waterStations.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(isDark)}
              >
                {t(item.nameKey)}
              </a>
            ))}
          </span>
        </div>
        <div className="data-sources-group">
          <span className={`data-sources-label ${labelClass}`}>{t('sources.toilets')}</span>
          <span className="data-sources-links">
            {DATA_SOURCES.toilets.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(isDark)}
              >
                {t(item.nameKey)}
              </a>
            ))}
          </span>
        </div>
      </div>
    </aside>
  )
}

export default DataSources
