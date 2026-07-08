import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getTrailById } from "../data/trails";
import TrailMap from "../components/TrailMap";
import ItineraryPlanner, { DayPath } from "../components/ItineraryPlanner";
import { SelectedCampsite } from "../utils/campsites";
import { GPXWaypoint } from "../utils/gpxParser";
import { gpxToTrackPoints, hasTrailGpx, loadTrailGpx, loadTrailElevations } from "../utils/trailGpx";

function TrailDetail() {
  const { trailId } = useParams<{ trailId: string }>();
  const trail = trailId ? getTrailById(trailId) : undefined;
  const [gpxTrack, setGpxTrack] = useState<Array<[number, number]>>([]);
  const [trackElevations, setTrackElevations] = useState<number[]>([]);
  const [gpxWaypoints, setGpxWaypoints] = useState<GPXWaypoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [dayPaths, setDayPaths] = useState<DayPath[]>([]);
  const [selectedCampsites, setSelectedCampsites] = useState<SelectedCampsite[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPlannerDrawer, setShowPlannerDrawer] = useState(true);

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
            未找到该径道
          </h1>
          <Link to="/" className="text-blue-600 hover:underline">
            返回首页
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
          返回
        </Link>
        <div className="h-6 w-px bg-gray-300"></div>
        <h1 className="text-lg font-bold text-gray-800">{trail.name}</h1>
        <button
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center justify-center w-7 h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
          title="查看径道信息"
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
              <h2 className="text-2xl font-bold text-gray-800">{trail.name}</h2>
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
                    总长度
                  </span>
                  <p className="text-xl font-semibold text-gray-800">
                    {trail.length} 公里
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500 block mb-1">
                    段落数
                  </span>
                  <p className="text-xl font-semibold text-gray-800">
                    {trail.sections} 段
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500 block mb-1">位置</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {trail.location}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  简介
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {trail.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏地图 */}
      <div className="absolute inset-0 w-full h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-[500]">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">正在加载轨迹数据...</div>
            </div>
          </div>
        )}
          <TrailMap
            trail={trail}
            gpxTrack={gpxTrack.length > 0 ? gpxTrack : undefined}
            gpxWaypoints={gpxWaypoints.length > 0 ? gpxWaypoints : undefined}
            dayPaths={dayPaths.length > 0 ? dayPaths : undefined}
            selectedCampsites={selectedCampsites.length > 0 ? selectedCampsites : undefined}
          />

        {/* 右侧抽屉式行程规划 */}
        <div
          className={`absolute top-0 right-0 z-[1000] h-full w-full max-w-md pointer-events-auto transition-transform duration-300 ${
            showPlannerDrawer ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <ItineraryPlanner
            className="h-full rounded-none border-y-0 border-r-0 border-l border-gray-200 shadow-2xl"
              gpxWaypoints={gpxWaypoints.length > 0 ? gpxWaypoints : undefined}
              gpxTrack={gpxTrack.length > 0 ? gpxTrack : undefined}
              trackElevations={trackElevations.length > 0 ? trackElevations : undefined}
              trailId={trail.id}
              onPathsChange={setDayPaths}
              onCampsitesChange={setSelectedCampsites}
            />
          <button
            type="button"
            onClick={() => setShowPlannerDrawer(false)}
            className="absolute top-4 -left-12 bg-white border border-gray-300 rounded-l-md rounded-r-none px-3 py-2 text-sm text-gray-700 shadow hover:bg-gray-50"
            title="收起行程规划"
          >
            收起
          </button>
        </div>

        {!showPlannerDrawer && (
          <button
            type="button"
            onClick={() => setShowPlannerDrawer(true)}
            className="absolute top-4 right-4 z-[1001] bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 shadow hover:bg-gray-50 pointer-events-auto"
            title="展开行程规划"
          >
            打开规划
          </button>
        )}
      </div>
    </div>
  );
}

export default TrailDetail;
