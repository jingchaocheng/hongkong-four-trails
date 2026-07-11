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
import DataSources from "../components/DataSources";
import { useLocale } from "../i18n/LocaleContext";
import { localizeTrail } from "../i18n/trailLocale";

const MOBILE_MQ = "(max-width: 767px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

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
  const isMobile = useIsMobile();
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 手机底部抽屉约占半屏；桌面右侧抽屉约 28rem
  const mobileDrawerPx = Math.round(Math.min(viewportH * 0.5, 480));
  const mapFitPadding = useMemo(() => {
    if (isMobile) {
      return {
        topLeft: [16, 64] as [number, number],
        bottomRight: [
          16,
          showPlannerDrawer ? mobileDrawerPx + 12 : 56,
        ] as [number, number],
      };
    }
    return {
      topLeft: [72, 72] as [number, number],
      bottomRight: [showPlannerDrawer ? 460 : 48, 48] as [number, number],
    };
  }, [isMobile, showPlannerDrawer, mobileDrawerPx]);

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
      <div className="absolute top-3 left-3 right-3 md:right-auto z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2.5 md:px-4 md:py-3 flex items-center gap-2 md:gap-3 pointer-events-auto max-w-full md:max-w-none">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 shrink-0"
        >
          <svg
            className="w-5 h-5 mr-0.5 md:mr-1"
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
          <span className="hidden sm:inline">{t('common.back')}</span>
        </Link>
        <div className="h-5 w-px bg-gray-300 shrink-0"></div>
        <h1 className="text-base md:text-lg font-bold text-gray-800 truncate min-w-0">
          {displayTrail!.name}
        </h1>
        <button
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center justify-center w-7 h-7 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{displayTrail!.name}</h2>
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
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <p className="text-gray-600 text-base sm:text-lg mb-4">{trail.nameEn}</p>
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
              <DataSources variant="light" />
            </div>
          </div>
        </div>
      )}

      {/* 全屏地图 */}
      <div
        className={`absolute inset-0 w-full h-full ${
          isMobile && showPlannerDrawer ? "map-with-bottom-drawer" : ""
        }`}
      >
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

        {/* 行程规划：手机底部抽屉 / 桌面右侧抽屉 */}
        <div
          className={`absolute z-[1000] pointer-events-auto overflow-hidden transition-transform duration-300 ease-out
            inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
            md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-md md:rounded-none md:shadow-2xl
            ${
              showPlannerDrawer
                ? "translate-y-0 md:translate-x-0"
                : "translate-y-[calc(100%-3.25rem)] md:translate-y-0 md:translate-x-full"
            }`}
          style={
            isMobile
              ? { height: `${mobileDrawerPx}px` }
              : undefined
          }
        >
          {/* 手机端拖动条 / 展开收起 */}
          <button
            type="button"
            className="md:hidden w-full flex flex-col items-center pt-2 pb-1 bg-white border-b border-gray-100 shrink-0"
            onClick={() => setShowPlannerDrawer((open) => !open)}
            aria-label={showPlannerDrawer ? t('trail.collapsePlanner') : t('trail.expandPlanner')}
          >
            <span className="block w-10 h-1 rounded-full bg-gray-300 mb-1.5" />
            <span className="text-xs font-medium text-gray-500">
              {showPlannerDrawer ? t('trail.collapsePlanner') : t('trail.expandPlanner')}
            </span>
          </button>

          <div className="h-[calc(100%-2.75rem)] md:h-full">
            <ItineraryPlanner
              className="h-full rounded-none border-0 md:border-y-0 md:border-r-0 md:border-l md:border-gray-200 shadow-none"
              gpxWaypoints={gpxWaypoints.length > 0 ? gpxWaypoints : undefined}
              gpxTrack={gpxTrack.length > 0 ? gpxTrack : undefined}
              trackElevations={trackElevations.length > 0 ? trackElevations : undefined}
              trailName={displayTrail!.name}
              trailNameEn={trail.nameEn}
              trailId={trail.id}
              initialPlan={initialPlanRef.current}
              onPlanChange={handlePlanChange}
              onPathsChange={setDayPaths}
              onCampsitesChange={setSelectedCampsites}
              onFocusCampsite={handleFocusCampsite}
              focusedDay={focusedDay}
              onFocusedDayChange={setFocusedDay}
            />
          </div>
        </div>

        {/* 桌面端侧栏开关 */}
        <button
          type="button"
          onClick={() => setShowPlannerDrawer((open) => !open)}
          className={`hidden md:flex absolute top-4 z-[1001] items-center justify-center bg-white border border-gray-300 p-2 text-gray-700 shadow hover:bg-gray-50 pointer-events-auto transition-all duration-300 ${
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
