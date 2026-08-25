import React from 'react';
import { ServiceStatus } from '../types';
import { Translations } from '../i18n';

interface HeroStatusProps {
  status: ServiceStatus;
  headline?: string;
  subtitle?: string;
  t: Translations;
  overallUptime: number;
  avgLatency: number;
  totalEndpoints: number;
  totalProbes: number;
}

export const HeroStatus: React.FC<HeroStatusProps> = ({
  status,
  t,
  overallUptime,
  avgLatency,
  totalEndpoints,
  totalProbes,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'operational':
        return {
          dotBg: 'bg-[#34c759]',
          ringColor: 'bg-[#34c759]/20',
          headline: t.headlineOperational,
        };
      case 'degraded':
        return {
          dotBg: 'bg-[#ff9500]',
          ringColor: 'bg-[#ff9500]/20',
          headline: t.headlineDegraded,
        };
      case 'outage':
        return {
          dotBg: 'bg-[#ff3b30]',
          ringColor: 'bg-[#ff3b30]/20',
          headline: t.headlineOutage,
        };
      case 'no_data':
        return {
          dotBg: 'bg-[#86868b]',
          ringColor: 'bg-[#86868b]/20',
          headline: t.headlineNoData,
        };
      default:
        return {
          dotBg: 'bg-[#86868b]',
          ringColor: 'bg-[#86868b]/20',
          headline: t.headlineMaintenance,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="rounded-2xl glass-panel p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 transition-all">
      {/* Left: Concentric pulse status & single clean headline (Never wraps or duplicates) */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          <span
            className={`absolute w-5 h-5 rounded-full ${config.ringColor} ${
              status === 'operational' ? 'animate-pulse-ring' : ''
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-full ${config.dotBg} shadow-xs transition-all`}
          />
        </div>

        <span className="font-semibold text-[15px] sm:text-base tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] whitespace-nowrap">
          {config.headline}
        </span>
      </div>

      {/* Right: Responsive Metric Chips (Fluid single row on desktop, 2x2 grid on small mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-1.5 sm:gap-2 text-xs w-full lg:w-auto">
        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between sm:justify-center gap-2">
          <span className="text-[#86868b] dark:text-[#a1a1a6] whitespace-nowrap">{t.metricUptime}</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white font-mono">{status === 'no_data' ? '—' : `${overallUptime.toFixed(2)}%`}</span>
        </div>

        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between sm:justify-center gap-2">
          <span className="text-[#86868b] dark:text-[#a1a1a6] whitespace-nowrap">{t.metricLatency}</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white font-mono">{status === 'no_data' ? '—' : `${avgLatency}ms`}</span>
        </div>

        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between sm:justify-center gap-2">
          <span className="text-[#86868b] dark:text-[#a1a1a6] whitespace-nowrap">{t.metricPoPs}</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white font-mono">{totalEndpoints}</span>
        </div>

        <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between sm:justify-center gap-2">
          <span className="text-[#86868b] dark:text-[#a1a1a6] whitespace-nowrap">{t.metricProbes}</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white font-mono">{totalProbes.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
