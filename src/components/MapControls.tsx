import { DayPath } from './ItineraryPlanner'
import { DayPathLegend } from './MapLegend'

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
          <span>显示全部露营点（42）</span>
        </label>
      </div>
    </div>
  )
}
