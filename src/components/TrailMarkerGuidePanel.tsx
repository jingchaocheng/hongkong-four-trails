import { getTrailMarkerGuide } from '../data/trailSections'
import { useLocale, useLocalizedContent } from '../i18n/LocaleContext'

interface TrailMarkerGuidePanelProps {
  trailId: string
}

export default function TrailMarkerGuidePanel({ trailId }: TrailMarkerGuidePanelProps) {
  const { t } = useLocale()
  const lc = useLocalizedContent()
  const guide = getTrailMarkerGuide(trailId)
  if (!guide) return null

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {t('markerGuide.title')}
      </h3>
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 space-y-1.5 mb-4">
        <p>
          <span className="font-medium text-gray-700">{t('markerGuide.code')}</span>
          {guide.markerRange}
          {t('markerGuide.count', { n: guide.markerCount })}
        </p>
        <p>{lc(guide.spacingNote, 'simplified')}</p>
        <p>{lc(guide.endpointNote, 'simplified')}</p>
        <p className="text-xs text-gray-500 pt-1">{t('markerGuide.hint')}</p>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {t('markerGuide.sectionsTitle')}
      </h3>
      <div className="space-y-2">
        {guide.sections.map((seg) => (
          <div
            key={seg.section}
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          >
            <span className="shrink-0 font-semibold text-gray-800 w-14">
              {t('common.sectionN', { n: seg.section })}
            </span>
            <span className="shrink-0 font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
              {seg.fromMarker} → {seg.toMarker}
            </span>
            <span className="flex-1 text-gray-700">{lc(seg.route, 'simplified')}</span>
            <span className="shrink-0 text-gray-500 text-xs">
              {t('markerGuide.distanceKm', { n: seg.distanceKm })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
