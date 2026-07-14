import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocale } from '../i18n/LocaleContext'
import {
  countTrackPoints,
  downsampleTrackPositions,
  type GpxExportWaypoint,
  type GpxTrackDay,
  type GpxWaypointKind,
} from '../utils/exportGpx'
import { FALLBACK_BASEMAP_ID, getBasemapById } from '../utils/mapBasemaps'

interface GpxExportModalProps {
  open: boolean
  trailName: string
  filename: string
  days: GpxTrackDay[]
  waypoints: GpxExportWaypoint[]
  /** 凤凰径等可不提供加水站选项 */
  allowWater?: boolean
  onClose: () => void
  onConfirm: (waypoints: GpxExportWaypoint[]) => void
}

const KIND_ORDER: GpxWaypointKind[] = [
  'endpoint',
  'campsite',
  'supply',
  'water',
  'toilet',
]

const DAY_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
]

const KIND_COLORS: Record<GpxWaypointKind, string> = {
  endpoint: '#2563eb',
  campsite: '#059669',
  supply: '#7c3aed',
  water: '#0891b2',
  toilet: '#6b7280',
}

function kindLabelKey(kind: GpxWaypointKind): string {
  switch (kind) {
    case 'endpoint':
      return 'planner.gpxKindEndpoint'
    case 'campsite':
      return 'planner.gpxKindCampsite'
    case 'supply':
      return 'planner.gpxKindSupply'
    case 'water':
      return 'planner.gpxKindWater'
    case 'toilet':
      return 'planner.gpxKindToilet'
  }
}

function PreviewMapEffects({
  positions,
}: {
  positions: Array<[number, number]>
}) {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false })
      if (positions.length === 0) return
      if (positions.length === 1) {
        map.setView(positions[0], 14, { animate: false })
        return
      }
      map.fitBounds(L.latLngBounds(positions), {
        padding: [20, 20],
        animate: false,
        maxZoom: 15,
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [map, positions])

  return null
}

function GpxPreviewMap({
  days,
  waypoints,
}: {
  days: GpxTrackDay[]
  waypoints: GpxExportWaypoint[]
}) {
  const previewDays = useMemo(
    () =>
      days
        .filter((d) => d.positions.length >= 2)
        .map((d, i) => ({
          day: d.day,
          color: DAY_COLORS[i % DAY_COLORS.length],
          positions: downsampleTrackPositions(d.positions, 800).positions,
        })),
    [days]
  )

  /** 仅按轨迹适配视野，勾选航点变化时不反复 zoom */
  const fitPositions = useMemo(() => {
    const pts: Array<[number, number]> = []
    for (const d of previewDays) pts.push(...d.positions)
    return pts
  }, [previewDays])

  const basemap = getBasemapById(FALLBACK_BASEMAP_ID)
  const layer = basemap.layers[0]

  if (previewDays.length === 0) {
    return (
      <div className="h-44 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
        —
      </div>
    )
  }

  return (
    <div className="h-44 sm:h-52 rounded-lg border border-gray-200 overflow-hidden relative z-0">
      <MapContainer
        center={[22.3, 114.2]}
        zoom={11}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={layer.url}
          attribution={layer.attribution}
          subdomains={layer.subdomains}
          maxZoom={layer.maxZoom}
        />
        <PreviewMapEffects positions={fitPositions} />
        {previewDays.map((d) => (
          <Polyline
            key={d.day}
            positions={d.positions}
            pathOptions={{
              color: d.color,
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}
        {waypoints.map((w) => (
          <CircleMarker
            key={w.id}
            center={[w.lat, w.lng]}
            radius={5}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: KIND_COLORS[w.kind],
              fillOpacity: 0.95,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default function GpxExportModal({
  open,
  trailName,
  filename,
  days,
  waypoints,
  allowWater = true,
  onClose,
  onConfirm,
}: GpxExportModalProps) {
  const { t } = useLocale()
  const [includeWater, setIncludeWater] = useState(allowWater)
  const [includeToilet, setIncludeToilet] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setIncludeWater(allowWater)
    setIncludeToilet(true)
    setSelectedIds(new Set(waypoints.map((w) => w.id)))
  }, [open, waypoints, allowWater])

  const trackPointCount = useMemo(() => countTrackPoints(days), [days])

  const visibleWaypoints = useMemo(() => {
    return waypoints.filter((w) => {
      if (w.kind === 'water') return allowWater && includeWater
      if (w.kind === 'toilet') return includeToilet
      return true
    })
  }, [waypoints, allowWater, includeWater, includeToilet])

  const selectedVisible = useMemo(
    () => visibleWaypoints.filter((w) => selectedIds.has(w.id)),
    [visibleWaypoints, selectedIds]
  )

  const grouped = useMemo(() => {
    const map = new Map<GpxWaypointKind, GpxExportWaypoint[]>()
    for (const kind of KIND_ORDER) map.set(kind, [])
    for (const w of visibleWaypoints) {
      map.get(w.kind)?.push(w)
    }
    return KIND_ORDER.map((kind) => ({
      kind,
      items: map.get(kind) ?? [],
    })).filter((g) => g.items.length > 0)
  }, [visibleWaypoints])

  if (!open) return null

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      visibleWaypoints.forEach((w) => next.add(w.id))
      return next
    })
  }

  const clearVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      visibleWaypoints.forEach((w) => next.delete(w.id))
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{t('planner.gpxModalTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label={t('supply.cancel')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto flex-1 space-y-4 text-sm">
          <div className="rounded-lg border-2 border-amber-500 bg-amber-100 px-3 py-2.5 space-y-1.5 text-xs leading-relaxed text-amber-950 shadow-sm">
            <p className="font-bold text-amber-900 text-sm">{t('planner.gpxDisclaimerTitle')}</p>
            <p className="font-medium">{t('planner.gpxDisclaimerHowTo')}</p>
            <p className="font-medium">{t('planner.gpxDisclaimerSupply')}</p>
            <p className="font-medium">{t('planner.gpxDisclaimerBackup')}</p>
            <p className="text-amber-900/85">{t('planner.gpxDisclaimerSafety')}</p>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1 text-gray-700">
            <p className="font-medium text-gray-900">{trailName}</p>
            <p className="text-xs text-gray-500">{filename}</p>
            <p>
              {t('planner.gpxPreviewDays', { n: days.length })}
              {' · '}
              {t('planner.gpxPreviewTrackPoints', { n: trackPointCount })}
              {' · '}
              {t('planner.gpxPreviewWaypoints', { n: selectedVisible.length })}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('planner.gpxTrackPreview')}
            </p>
            <GpxPreviewMap days={days} waypoints={selectedVisible} />
            {days.length > 1 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                {days.map((d, i) => (
                  <span key={d.day} className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }}
                    />
                    {d.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('planner.gpxOptions')}
            </p>
            {allowWater && (
              <label className="flex items-center gap-2 text-gray-800">
                <input
                  type="checkbox"
                  checked={includeWater}
                  onChange={(e) => setIncludeWater(e.target.checked)}
                />
                <span>{t('planner.gpxIncludeWater')}</span>
                <span className="text-xs text-gray-400">
                  ({waypoints.filter((w) => w.kind === 'water').length})
                </span>
              </label>
            )}
            <label className="flex items-center gap-2 text-gray-800">
              <input
                type="checkbox"
                checked={includeToilet}
                onChange={(e) => setIncludeToilet(e.target.checked)}
              />
              <span>{t('planner.gpxIncludeToilet')}</span>
              <span className="text-xs text-gray-400">
                ({waypoints.filter((w) => w.kind === 'toilet').length})
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('planner.gpxWaypointList')}
              </p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={selectAllVisible}
                >
                  {t('planner.gpxSelectAll')}
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:underline"
                  onClick={clearVisible}
                >
                  {t('planner.gpxSelectNone')}
                </button>
              </div>
            </div>

            {grouped.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">{t('planner.gpxNoWaypoints')}</p>
            ) : (
              <div className="space-y-3">
                {grouped.map(({ kind, items }) => (
                  <div key={kind} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 flex justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: KIND_COLORS[kind] }}
                        />
                        {t(kindLabelKey(kind))}
                      </span>
                      <span>
                        {items.filter((w) => selectedIds.has(w.id)).length}/{items.length}
                      </span>
                    </div>
                    <ul className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                      {items.map((w) => (
                        <li key={w.id}>
                          <label className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={selectedIds.has(w.id)}
                              onChange={() => toggleId(w.id)}
                            />
                            <span className="min-w-0">
                              <span className="block text-gray-900 leading-snug">{w.name}</span>
                              {w.description && (
                                <span className="block text-xs text-gray-400 truncate">
                                  {w.description}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('supply.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedVisible)}
            className="flex-1 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            {t('planner.gpxConfirmDownload')}
          </button>
        </div>
      </div>
    </div>
  )
}
