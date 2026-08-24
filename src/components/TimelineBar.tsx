import React, { useState } from 'react';
import { DayHistory } from '../types';
import { Translations } from '../i18n';

interface TimelineBarProps {
  history: DayHistory[];
  daysCount?: number; // 30, 60, or 90
  t: Translations;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  history,
  daysCount = 90,
  t,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    day: DayHistory;
    index: number;
    leftPercent: number;
  } | null>(null);

  // Slice to the selected days count
  const displayedHistory = history.slice(-daysCount);

  const getPillColor = (status: DayHistory['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-[#34c759] hover:bg-[#30d158] dark:bg-[#30d158]/90 dark:hover:bg-[#30d158]';
      case 'degraded':
        return 'bg-[#ff9500] hover:bg-[#ffaa33] dark:bg-[#ff9f0a] dark:hover:bg-[#ffaa33]';
      case 'outage':
        return 'bg-[#ff3b30] hover:bg-[#ff453a] dark:bg-[#ff453a] dark:hover:bg-[#ff453a]';
      case 'maintenance':
        return 'bg-[#86868b] hover:bg-[#6e6e73] dark:bg-[#636366] dark:hover:bg-[#8e8e93]';
      default:
        return 'bg-[#e5e5ea] dark:bg-[#3a3a3c]';
    }
  };

  const getStatusBadge = (status: DayHistory['status']) => {
    switch (status) {
      case 'operational':
        return {
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
          dot: 'bg-[#34c759]',
          noteColor: 'text-[#6e6e73] dark:text-[#a1a1a6]',
          label: t.statusOperational,
        };
      case 'degraded':
        return {
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
          dot: 'bg-[#ff9500]',
          noteColor: 'text-[#ff9500] dark:text-[#ff9f0a]',
          label: t.statusDegraded,
        };
      case 'outage':
        return {
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
          dot: 'bg-[#ff3b30]',
          noteColor: 'text-[#ff3b30] dark:text-[#ff453a]',
          label: t.statusOutage,
        };
      case 'maintenance':
      default:
        return {
          bg: 'bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300',
          dot: 'bg-[#86868b]',
          noteColor: 'text-[#6e6e73] dark:text-[#a1a1a6]',
          label: t.statusMaintenance,
        };
    }
  };

  return (
    <div className="relative w-full pt-1 select-none">
      {/* Pills Container */}
      <div className="flex items-center gap-[2px] sm:gap-[2.5px] h-6 py-0.5 w-full">
        {displayedHistory.map((item, idx) => {
          const leftPercent = ((idx + 0.5) / displayedHistory.length) * 100;

          return (
            <div
              key={item.date || idx}
              onMouseEnter={() =>
                setHoveredDay({
                  day: item,
                  index: idx,
                  leftPercent,
                })
              }
              onMouseLeave={() => setHoveredDay(null)}
              className={`flex-1 h-full min-w-[2px] rounded-[3px] transition-all duration-150 cursor-pointer ${getPillColor(
                item.status
              )} hover:scale-y-125 hover:z-20`}
            />
          );
        })}
      </div>

      {/* Floating Popover Bubble Below Hovered Pill */}
      {hoveredDay && (
        <div
          className="absolute top-[32px] z-50 pointer-events-none transition-all duration-100 ease-out"
          style={{
            left: `${hoveredDay.leftPercent}%`,
            transform: `translateX(-${Math.min(
              85,
              Math.max(15, hoveredDay.leftPercent)
            )}%)`,
          }}
        >
          <div className="relative p-3 rounded-2xl bg-white dark:bg-[#1c1c1e] text-xs text-[#1d1d1f] dark:text-white shadow-[0_12px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-black/[0.08] dark:border-white/10 min-w-[185px] max-w-[280px]">
            {/* Upward Pointer Arrow */}
            <div
              className="absolute -top-1 w-2.5 h-2.5 bg-white dark:bg-[#1c1c1e] border-l border-t border-black/[0.08] dark:border-white/10 transform rotate-45"
              style={{
                left: `${Math.min(
                  85,
                  Math.max(15, hoveredDay.leftPercent)
                )}%`,
                transform: 'translateX(-50%) rotate(45deg)',
              }}
            />

            {/* Header: Date + Status Badge */}
            <div className="flex items-center justify-between gap-3 font-semibold pb-1.5 border-b border-black/[0.05] dark:border-white/10">
              <span className="font-mono text-[11px] text-[#1d1d1f] dark:text-white font-semibold">
                {hoveredDay.day.date}
              </span>
              <span
                className={`text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                  getStatusBadge(hoveredDay.day.status).bg
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${
                    getStatusBadge(hoveredDay.day.status).dot
                  }`}
                />
                {getStatusBadge(hoveredDay.day.status).label}
              </span>
            </div>

            {/* Metrics List */}
            <div className="pt-2 space-y-1 text-[11px] text-[#6e6e73] dark:text-[#a1a1a6]">
              <div className="flex justify-between">
                <span>{t.dailyUptime}:</span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">
                  {hoveredDay.day.uptime}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t.avgLatency}:</span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">
                  {hoveredDay.day.avgLatency} ms
                </span>
              </div>

              {/* Expanded Description Inside the Bubble */}
              {hoveredDay.day.note && (
                <div className="pt-2 mt-1.5 border-t border-black/[0.05] dark:border-white/10">
                  <p
                    className={`text-[11px] leading-relaxed ${
                      getStatusBadge(hoveredDay.day.status).noteColor
                    }`}
                  >
                    {hoveredDay.day.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clean Static Footer Row */}
      <div className="flex items-center justify-between text-[11px] font-medium text-[#86868b] dark:text-[#6e6e73] mt-1.5 px-0.5">
        <span>
          {daysCount} {t.daysAgo}
        </span>
        <span className="text-[#6e6e73] dark:text-[#86868b]">
          {displayedHistory.filter((d) => d.status === 'operational').length ===
          displayedHistory.length
            ? t.fullOperational
            : `${(
                (displayedHistory.filter((d) => d.status === 'operational')
                  .length /
                  displayedHistory.length) *
                100
              ).toFixed(1)}% ${t.uptimeRate}`}
        </span>
        <span>{t.today}</span>
      </div>
    </div>
  );
};
