import { getTrailMarkerGuide } from '../data/trailSections'

interface TrailMarkerGuidePanelProps {
  trailId: string
}

export default function TrailMarkerGuidePanel({ trailId }: TrailMarkerGuidePanelProps) {
  const guide = getTrailMarkerGuide(trailId)
  if (!guide) return null

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">标注点说明</h3>
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 space-y-1.5 mb-4">
        <p>
          <span className="font-medium text-gray-700">编号：</span>
          {guide.markerRange}（共 {guide.markerCount} 支）
        </p>
        <p>{guide.spacingNote}</p>
        <p>{guide.endpointNote}</p>
        <p className="text-xs text-gray-500 pt-1">
          地图与行程规划中的 M / W / H / L 标距柱即对应下列编号，可用于定位与分段规划。
        </p>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">分段与标距柱</h3>
      <div className="space-y-2">
        {guide.sections.map((seg) => (
          <div
            key={seg.section}
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          >
            <span className="shrink-0 font-semibold text-gray-800 w-14">
              第 {seg.section} 段
            </span>
            <span className="shrink-0 font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
              {seg.fromMarker} → {seg.toMarker}
            </span>
            <span className="flex-1 text-gray-700">{seg.route}</span>
            <span className="shrink-0 text-gray-500 text-xs">约 {seg.distanceKm} km</span>
          </div>
        ))}
      </div>
    </div>
  )
}
