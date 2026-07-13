import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { trails } from '../data/trails'
import { gpxToTrackPoints, loadTrailGpx, TRAIL_GPX_IDS } from '../utils/trailGpx'
import { useLocale } from '../i18n/LocaleContext'
import { localizeTrail } from '../i18n/trailLocale'
import LocaleToggle from '../components/LocaleToggle'

type LatLng = [number, number]

function buildTrackPath(points: LatLng[]): string {
  if (points.length < 2) return ''

  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  const pad = 8
  const size = 100 - pad * 2
  const scale = size / Math.max(latRange || 1, lngRange || 1)
  const drawWidth = lngRange * scale
  const drawHeight = latRange * scale
  const offsetX = (100 - drawWidth) / 2
  const offsetY = (100 - drawHeight) / 2

  return points
    .map((p, index) => {
      const x = (p[1] - minLng) * scale + offsetX
      const y = 100 - ((p[0] - minLat) * scale + offsetY)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function RouteTrackThumbnail({
  trackPoints,
  noTrackLabel,
  thumbLabel,
}: {
  trackPoints?: LatLng[]
  noTrackLabel: string
  thumbLabel: string
}) {
  const path = trackPoints && trackPoints.length > 1 ? buildTrackPath(trackPoints) : ''

  if (!path) {
    return <div className="route-thumbnail-fallback">{noTrackLabel}</div>
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="route-track-svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label={thumbLabel}
    >
      <path d={path} className="route-track-line" />
    </svg>
  )
}

function Home() {
  const { locale, t } = useLocale()
  const [gpxTracks, setGpxTracks] = useState<Record<string, LatLng[]>>({})
  const [hoveredTrailId, setHoveredTrailId] = useState<string | null>(null)

  useEffect(() => {
    const loadGpxTracks = async () => {
      const trailIds = TRAIL_GPX_IDS

      try {
        const results = await Promise.all(
          trailIds.map(async (trailId) => {
            const gpxData = await loadTrailGpx(trailId)
            if (!gpxData) return null
            const points = gpxToTrackPoints(gpxData)
            return points.length > 1 ? { trailId, points } : null
          })
        )

        const nextTracks = results.reduce<Record<string, LatLng[]>>((acc, item) => {
          if (item) acc[item.trailId] = item.points
          return acc
        }, {})

        if (Object.keys(nextTracks).length > 0) {
          setGpxTracks(nextTracks)
        }
      } catch (error) {
        console.error('首页轨迹缩略图加载失败:', error)
      }
    }

    loadGpxTracks()
  }, [])

  return (
    <div className="cinema-page cinema-grain home-serif-font h-screen w-screen overflow-hidden flex flex-col">
      <div className="z-20 text-center px-4 pt-8 pb-4 shrink-0 relative">
        <div className="absolute right-4 top-8">
          <LocaleToggle />
        </div>
        <p className="uppercase tracking-[0.35em] text-xs text-amber-300/80 mb-3">A HONG KONG ENDURANCE CHRONICLE</p>
        <h1 className="text-4xl md:text-6xl font-black text-amber-50 mb-2">{t('home.title')}</h1>
        <p className="text-sm md:text-lg text-slate-300">Hong Kong Four Trails</p>
      </div>

      <div
        className="route-accordion route-accordion-fullscreen main-content"
        onMouseLeave={() => setHoveredTrailId(null)}
      >
        {trails.map((trail, index) => {
          const display = localizeTrail(trail, locale)
          const isActive = hoveredTrailId === trail.id
          const isSibling = hoveredTrailId !== null && hoveredTrailId !== trail.id

          return (
            <Link
              key={trail.id}
              to={`/trail/${trail.id}`}
              onMouseEnter={() => setHoveredTrailId(trail.id)}
              className={[
                `route-accordion-item route-theme-${trail.id} cinema-panel rounded-2xl overflow-hidden`,
                isActive ? 'is-active' : '',
                isSibling ? 'is-sibling' : '',
              ].join(' ')}
            >
              <div className="route-accordion-inner route-accordion-content py-6 pr-6 pl-10 md:py-8 md:pr-8 md:pl-12 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="route-title text-3xl md:text-4xl font-black text-amber-50 drop-shadow-xl tracking-wide">{display.name}</h3>
                    <span className="route-reveal route-reveal-inline whitespace-nowrap text-sm font-semibold text-amber-200 bg-amber-400/10 border border-amber-200/40 px-3 py-1 rounded-full">
                    {trail.length}{t('common.km')}
                    </span>
                  </div>
                  <p className="route-reveal route-reveal-inline text-amber-50/85 text-sm md:text-base mb-2">{trail.nameEn}</p>
                  <p className="route-reveal route-reveal-inline route-description text-slate-200/90 mb-4 max-w-xl">{display.description}</p>
                  <div className="route-reveal route-reveal-inline route-thumbnail-wrap mb-4">
                    <div className="route-thumbnail" aria-hidden="true">
                      <RouteTrackThumbnail
                        trackPoints={gpxTracks[trail.id]}
                        noTrackLabel={t('home.noTrack')}
                        thumbLabel={t('home.trackThumb', { name: display.name })}
                      />
                    </div>
                  </div>
                </div>
                <div className="route-reveal route-reveal-flex flex items-end justify-between">
                  <div className="flex items-center text-sm md:text-base text-slate-100/95">
                    <span className="mr-4">📍 {display.location}</span>
                    <span>🏔️ {trail.sections}{t('common.section')}</span>
                  </div>
                  <span className="text-6xl md:text-8xl font-black text-white/10 leading-none">
                    0{index + 1}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Home
