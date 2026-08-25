import React, { useState } from 'react';
import { LatencyPoint } from '../types';
import { Translations } from '../i18n';

interface LatencySparklineProps {
  data: LatencyPoint[];
  color?: string;
  t: Translations;
}

export const LatencySparkline: React.FC<LatencySparklineProps> = ({
  data,
  color = '#34c759',
  t,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<LatencyPoint | null>(null);

  if (!data || data.length === 0) return null;

  const latencies = data.map((d) => d.latency);
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  const range = max - min || 1;
  const height = 70;
  const width = 460;
  const padding = 10;

  // Build SVG path
  const points = data.map((d, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.latency - min) / range) * (height - 2 * padding);
    return { x, y, point: d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full bg-[#f5f5f7]/80 dark:bg-white/[0.02] rounded-2xl p-4 border border-[#e5e5ea]/80 dark:border-white/[0.05]">
      <div className="flex items-center justify-between text-xs text-[#86868b] dark:text-[#a1a1a6] mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {t.latencyTrendTitle}
          </span>
          {hoveredPoint && (
            <span className="px-2 py-0.5 rounded-full bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-[11px] font-semibold">
              {hoveredPoint.time} : {hoveredPoint.latency}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>
            {t.min}: <b className="text-[#1d1d1f] dark:text-[#f5f5f7]">{min}ms</b>
          </span>
          <span>
            {t.avg}: <b className="text-[#1d1d1f] dark:text-[#f5f5f7]">{avg}ms</b>
          </span>
          <span>
            {t.max}: <b className="text-[#1d1d1f] dark:text-[#f5f5f7]">{max}ms</b>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-20 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          <path d={areaD} fill="url(#latencyGradient)" />

          {/* Stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-white dark:fill-neutral-900 stroke-2 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              stroke={color}
              onMouseEnter={() => setHoveredPoint(p.point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
