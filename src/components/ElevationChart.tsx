import { TrailMarker } from "../utils/gpxParser";
import { useLocale } from "../i18n/LocaleContext";

interface ElevationChartProps {
  markers: TrailMarker[];
  profile?: number[];
  elevationGain?: number;
  /** 总距离（公里），用于 X 轴；缺省时由标记点估算 */
  distanceKm?: number;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function markersDistanceKm(markers: TrailMarker[]): number {
  let total = 0;
  for (let i = 1; i < markers.length; i++) {
    total += haversineKm(
      [markers[i - 1].lat, markers[i - 1].lng],
      [markers[i].lat, markers[i].lng]
    );
  }
  return total;
}

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

function niceTicks(min: number, max: number, tickCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    const pad = Math.max(10, Math.abs(min) * 0.05 || 10);
    return niceTicks(min - pad, max + pad, tickCount);
  }
  const span = max - min;
  const rawStep = span / Math.max(1, tickCount - 1);
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / mag;
  const niceResidual =
    residual <= 1.5 ? 1 : residual <= 3 ? 2 : residual <= 7 ? 5 : 10;
  const step = niceResidual * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

function formatKm(km: number): string {
  if (km >= 10) return km.toFixed(0);
  if (km >= 1) return km.toFixed(1);
  return km.toFixed(2);
}

function ElevationChart({
  markers,
  profile,
  elevationGain,
  distanceKm,
}: ElevationChartProps) {
  const { t } = useLocale();

  if (markers.length < 2) {
    return (
      <p className="text-gray-500 text-center py-8">
        {t("elevation.needTwoMarkers")}
      </p>
    );
  }

  const useProfile = !!(profile && profile.length > 1);
  const rawSeries = useProfile ? profile! : markers.map((m) => m.elevation);
  const series = useProfile ? smoothSeries(rawSeries, 5) : rawSeries;

  const maxElevation = Math.round(Math.max(...rawSeries));
  const minElevation = Math.round(Math.min(...rawSeries));
  const elevPad = Math.max(5, Math.round((maxElevation - minElevation) * 0.08) || 5);
  const yMin = minElevation - elevPad;
  const yMax = maxElevation + elevPad;
  const yRange = yMax - yMin || 1;

  const totalKm =
    distanceKm != null && distanceKm > 0
      ? distanceKm
      : Math.max(markersDistanceKm(markers), 0.01);

  const markerGain = markers.slice(1).reduce((sum, m, i) => {
    const diff = m.elevation - markers[i].elevation;
    return sum + (diff > 0 ? diff : 0);
  }, 0);
  const displayGain = elevationGain != null ? elevationGain : markerGain;

  const W = 420;
  const H = 200;
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (km: number) => padL + (km / totalKm) * plotW;
  const toY = (ele: number) => padT + (1 - (ele - yMin) / yRange) * plotH;

  const points = series.map((elevation, index) => {
    const km = (index / (series.length - 1)) * totalKm;
    return {
      x: toX(km),
      y: toY(elevation),
      elevation,
      km,
    };
  });

  const pathData = buildSmoothPath(points);
  const areaPath = `${pathData} L ${toX(totalKm).toFixed(2)} ${
    padT + plotH
  } L ${toX(0).toFixed(2)} ${padT + plotH} Z`;

  const yTicks = niceTicks(yMin, yMax, 5).filter((v) => v >= yMin && v <= yMax);
  const xTicks = niceTicks(0, totalKm, totalKm > 20 ? 6 : 5).filter(
    (v) => v >= 0 && v <= totalKm + 1e-6
  );

  const gradientId = `elevationGradient-${Math.round(totalKm * 100)}-${minElevation}-${maxElevation}`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-56"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t("elevation.chartLabel")}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="#f9fafb"
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {yTicks.map((ele) => {
          const y = toY(ele);
          return (
            <g key={`y-${ele}`}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round(ele)}
              </text>
            </g>
          );
        })}

        {xTicks.map((km) => {
          const x = toX(Math.min(km, totalKm));
          return (
            <g key={`x-${km}`}>
              <line
                x1={x}
                y1={padT}
                x2={x}
                y2={padT + plotH}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padT + plotH + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {formatKm(km)}
              </text>
            </g>
          );
        })}

        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="#9ca3af"
          strokeWidth="1.25"
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="#9ca3af"
          strokeWidth="1.25"
        />

        <text
          x={12}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
          transform={`rotate(-90 12 ${padT + plotH / 2})`}
        >
          {t("elevation.axisY")}
        </text>
        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
        >
          {t("elevation.axisX")}
        </text>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={pathData}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {!useProfile &&
          points.map((point, index) => {
            const showLabel =
              index % Math.ceil(points.length / 5) === 0 ||
              index === points.length - 1;
            return (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2.5"
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth="1"
                />
                {showLabel ? (
                  <text
                    x={point.x}
                    y={point.y - 6}
                    fontSize="9"
                    fill="#374151"
                    textAnchor="middle"
                  >
                    {Math.round(point.elevation)}
                  </text>
                ) : null}
              </g>
            );
          })}
      </svg>

      <div className="mt-2 flex justify-between text-xs text-gray-600">
        <div>
          <p className="font-semibold">{t("elevation.min")}</p>
          <p>
            {minElevation} {t("elevation.meters")}
          </p>
        </div>
        <div className="text-center">
          <p className="font-semibold">{t("elevation.max")}</p>
          <p>
            {maxElevation} {t("elevation.meters")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{t("elevation.gain")}</p>
          <p>
            {Math.round(displayGain)} {t("elevation.meters")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ElevationChart;
