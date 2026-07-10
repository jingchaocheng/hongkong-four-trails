import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getTrailById } from "../data/trails";
import TrailMap, { FocusCampsiteRequest } from "../components/TrailMap";
import ItineraryPlanner, { DayPath } from "../components/ItineraryPlanner";
import { SelectedCampsite } from "../utils/campsites";
import { GPXWaypoint } from "../utils/gpxParser";
import { gpxToTrackPoints, hasTrailGpx, loadTrailGpx, loadTrailElevations } from "../utils/trailGpx";
import {
  encodePlanToSearchParams,
  PlannerState,
  resolveInitialPlan,
  savePlanToStorage,
  decodePlanFromSearchParams,
} from "../utils/planState";
import TrailMarkerGuidePanel from "../components/TrailMarkerGuidePanel";
import { useLocale } from "../i18n/LocaleContext";
import { localizeTrail } from "../i18n/trailLocale";

function TrailDetail() {
  const { trailId } = useParams<{ trailId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const trail = trailId ? getTrailById(trailId) : undefined;
  const initialPlanRef = useRef(
    trailId ? resolveInitialPlan(trailId, searchParams) : null
  );
  const [gpxTrack, setGpxTrack] = useState<Array<[number, number]>>([]);
  const [trackElevations, setTrackElevations] = useState<number[]>([]);
  const [gpxWaypoints, setGpxWaypoints] = useState<GPXWaypoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [dayPaths, setDayPaths] = useState<DayPath[]>([]);
  const [selectedCampsites, setSelectedCampsites] = useState<SelectedCampsite[]>([]);
  const [showAllCampsites, setShowAllCampsites] = useState(false);
  const [focusCampsite, setFocusCampsite] = useState<FocusCampsiteRequest | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPlannerDrawer, setShowPlannerDrawer] = useState(true);
  const mapFitPadding = useMemo(
    () => ({
      topLeft: [72, 72] as [number, number],
      bottomRight: [showPlannerDrawer ? 460 : 48, 48] as [number, number],
    }),
    [showPlannerDrawer]
  );

  const { locale, t } = useLocale();
  const displayTrail = trail ? localizeTrail(trail, locale) : undefined;

  const handlePlanChange = useCallback(
    (state: PlannerState) => {
      if (!trailId) return;
      savePlanToStorage(trailId, state);
      const nextParams = encodePlanToSearchParams(state);
      const current = decodePlanFromSearchParams(searchParams);
      if (
        current &&
        current.numDays === state.numDays &&
        current.startMarker === state.startMarker &&
        current.reverse === state.reverse &&
        current.isLoop === state.isLoop &&
        current.splitIndices.join(',') === state.splitIndices.join(',') &&
        JSON.stringify(current.dayCampsites) === JSON.stringify(state.dayCampsites)
      ) {
        return;
      }
      setSearchParams(nextParams, { replace: true });
    },
    [trailId, setSearchParams, searchParams]
  );

  const handleFocusCampsite = useCallback((campsiteId: string) => {
    setFocusCampsite({ id: campsiteId, seq: Date.now() });
  }, []);

  // 加载GPX文件
  useEffect(() => {
    if (!trail) return;

    setGpxTrack([]);
    setTrackElevations([]);
    setGpxWaypoints([]);

    const loadGPX = async () => {
      if (!hasTrailGpx(trail.id)) return;

      try {
        setLoading(true);
        const [gpxData, elevations] = await Promise.all([
          loadTrailGpx(trail.id),
          loadTrailElevations(trail.id),
        ]);
        if (!gpxData) return;

        const trackPoints = gpxToTrackPoints(gpxData);
        if (trackPoints.length > 0) {
          setGpxTrack(trackPoints);
        }

        if (elevations.length > 0) {
          setTrackElevations(elevations);
        }

        if (gpxData.waypoints.length > 0) {
          setGpxWaypoints(gpxData.waypoints);
        }
      } catch (error) {
        console.error("加载GPX文件失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGPX();
  }, [trail]);

  if (!trail) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {t('trail.notFound')}
          </h1>
          <Link to="/" className="text-blue-600 hover:underline">
            {t('common.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-white overflow-hidden">
      {/* 浮动的标题栏 */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t('common.back')}
        </Link>
        <div className="h-6 w-px bg-gray-300"></div>
        <h1 className="text-lg font-bold text-gray-800">{displayTrail!.name}</h1>
        <button
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center justify-center w-7 h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
          title={t('trail.trailInfo')}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>

      {/* 浮窗 */}
      {showInfoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">{displayTrail!.name}</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 text-lg mb-4">{trail.nameEn}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500 block mb-1">
                    {t('trail.totalLength')}
                  </span>
                  <p className="text-xl font-semibold text-gray-800">
                    {trail.length} {t('common.km')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500 block mb-1">
                    {t('trail.sectionCount')}
                  </span>
                  <p className="text-xl font-semibold text-gray-800">
                    {trail.sections} {t('common.section')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500 block mb-1">{t('trail.location')}</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {displayTrail!.location}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {t('trail.intro')}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {displayTrail!.description}
                </p>
              </div>
              <TrailMarkerGuidePanel trailId={trail.id} />
            </div>
          </div>
        </div>
      )}

      {/* 全屏地图 */}
      <div className="absolute inset-0 w-full h-full">
        <TrailMap
          trail={trail}
          gpxTrack={gpxTrack.length > 0 ? gpxTrack : undefined}
          gpxWaypoints={gpxWaypoints.length > 0 ? gpxWaypoints : undefined}
          dayPaths={dayPaths.length > 0 ? dayPaths : undefined}
          selectedCampsites={selectedCampsites.length > 0 ? selectedCampsites : undefined}
          showAllCampsites={showAllCampsites}
          onShowAllCampsitesChange={setShowAllCampsites}
          focusCampsite={focusCampsite}
          focusedDay={focusedDay}
          fitPadding={mapFitPadding}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-[500] pointer-events-none">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">{t('common.loadingTrack')}</div>
            </div>
          </div>
        )}

        {/* 右侧抽屉式行程规划 */}
        <div
          className={`absolute top-0 right-0 z-[1000] h-full w-full max-w-md pointer-events-auto overflow-hidden transition-transform duration-300 ${
            showPlannerDrawer ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <ItineraryPlanner
            className="h-full rounded-none border-y-0 border-r-0 border-l border-gray-200 shadow-2xl"
              gpxWaypoints={gpxWaypoints.length > 0 ? gpxWaypoints : undefined}
              gpxTrack={gpxTrack.length > 0 ? gpxTrack : undefined}
              trackElevations={trackElevations.length > 0 ? trackElevations : undefined}
              trailName={displayTrail!.name}
              trailNameEn={trail.nameEn}
              initialPlan={initialPlanRef.current}
              onPlanChange={handlePlanChange}
              onPathsChange={setDayPaths}
              onCampsitesChange={setSelectedCampsites}
              onFocusCampsite={handleFocusCampsite}
              focusedDay={focusedDay}
              onFocusedDayChange={setFocusedDay}
            />
        </div>

        <button
          type="button"
          onClick={() => setShowPlannerDrawer((open) => !open)}
          className={`absolute top-4 z-[1001] flex items-center justify-center bg-white border border-gray-300 p-2 text-gray-700 shadow hover:bg-gray-50 pointer-events-auto transition-all duration-300 ${
            showPlannerDrawer
              ? "left-[calc(100%-min(28rem,100%))] right-auto -translate-x-full rounded-l-md rounded-r-none border-r-0"
              : "right-4 left-auto translate-x-0 rounded-md"
          }`}
          aria-label={showPlannerDrawer ? t('trail.collapsePlanner') : t('trail.expandPlanner')}
          title={showPlannerDrawer ? t('trail.collapsePlanner') : t('trail.expandPlanner')}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${
              showPlannerDrawer ? "rotate-0" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TrailDetail;
