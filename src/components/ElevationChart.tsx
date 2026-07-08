import { TrailMarker } from "../utils/gpxParser";

interface ElevationChartProps {
  markers: TrailMarker[];
  profile?: number[]; // 密集海拔剖面（可选），提供时用它绘制曲线
  elevationGain?: number; // 精确累计爬升（可选），提供时覆盖显示
}

// 移动平均平滑，弱化 DEM 噪声让曲线更顺滑
function smoothSeries(values: number[], window: number): number[] {
  if (values.length <= 2 || window <= 1) return values;
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < values.length) {
        sum += values[j];
        count++;
      }
    }
    return sum / count;
  });
}

// 用 Catmull-Rom 样条生成平滑路径
function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function ElevationChart({
  markers,
  profile,
  elevationGain,
}: ElevationChartProps) {
  if (markers.length < 2) {
    return (
      <p className="text-gray-500 text-center py-8">
        需要至少两个标记点才能显示高度图
      </p>
    );
  }

  const useProfile = !!(profile && profile.length > 1);
  const rawSeries = useProfile ? profile! : markers.map((m) => m.elevation);
  // 密集剖面做移动平均平滑（稀疏标记点不平滑，保留真实拐点）
  const series = useProfile ? smoothSeries(rawSeries, 5) : rawSeries;

  // 显示与缩放用平滑前的真实极值
  const maxElevation = Math.round(Math.max(...rawSeries));
  const minElevation = Math.round(Math.min(...rawSeries));
  const range = maxElevation - minElevation || 1;

  const points = series.map((elevation, index) => {
    const x = (index / (series.length - 1)) * 100;
    const y = 100 - ((elevation - minElevation) / range) * 100;
    return { x, y, elevation };
  });

  const pathData = buildSmoothPath(points);

  const markerGain = markers.slice(1).reduce((sum, m, i) => {
    const diff = m.elevation - markers[i].elevation;
    return sum + (diff > 0 ? diff : 0);
  }, 0);
  const displayGain = elevationGain != null ? elevationGain : markerGain;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-64"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="elevationGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 背景网格 */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}

        {/* 填充区域 */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="url(#elevationGradient)"
        />

        {/* 高度线 */}
        <path
          d={pathData}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* 标记点（仅稀疏模式下显示圆点与标注） */}
        {!useProfile &&
          points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="0.5"
              />
              {index % Math.ceil(points.length / 5) === 0 ||
              index === points.length - 1 ? (
                <text
                  x={point.x}
                  y={point.y - 2}
                  fontSize="3"
                  fill="#374151"
                  textAnchor="middle"
                >
                  {point.elevation}m
                </text>
              ) : null}
            </g>
          ))}
      </svg>

      <div className="mt-4 flex justify-between text-xs text-gray-600">
        <div>
          <p className="font-semibold">最低点</p>
          <p>{minElevation} 米</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">最高点</p>
          <p>{maxElevation} 米</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">总爬升</p>
          <p>{Math.round(displayGain)} 米</p>
        </div>
      </div>

      {/* <div className="mt-4 space-y-1">
        {markers.map((marker, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {marker.id} - {marker.name}
            </span>
            <span className="font-semibold text-gray-800">{marker.elevation} 米</span>
          </div>
        ))}
      </div> */}
    </div>
  );
}

export default ElevationChart;
