import React, { useState } from 'react';
import {
  ChevronDown,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { ServiceLiveState } from '../types';
import { TimelineBar } from './TimelineBar';
import { LatencySparkline } from './LatencySparkline';
import { Translations } from '../i18n';

interface ServiceCardProps {
  service: ServiceLiveState;
  timelineDays: number;
  t: Translations;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  timelineDays,
  t,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: ServiceLiveState['status']) => {
    switch (status) {
      case 'operational':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759] dark:text-[#30d158]" />,
          label: t.statusOperational,
          color: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50 border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20',
          dot: 'bg-[#34c759]',
        };
      case 'degraded':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#ff9500] dark:text-[#ff9f0a]" />,
          label: t.statusDegraded,
          color: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-50 border-amber-200/80 dark:bg-amber-500/10 dark:border-amber-500/20',
          dot: 'bg-[#ff9500]',
        };
      case 'outage':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-[#ff3b30] dark:text-[#ff453a]" />,
          label: t.statusOutage,
          color: 'text-rose-700 dark:text-rose-400',
          bg: 'bg-rose-50 border-rose-200/80 dark:bg-rose-500/10 dark:border-rose-500/20',
          dot: 'bg-[#ff3b30]',
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-[#86868b] dark:text-[#a1a1a6]" />,
          label: t.statusMaintenance,
          color: 'text-neutral-700 dark:text-neutral-300',
          bg: 'bg-neutral-100 border-neutral-200 dark:bg-white/10 dark:border-white/10',
          dot: 'bg-neutral-500',
        };
    }
  };

  const badge = getStatusBadge(service.status);

  return (
    <div className="relative rounded-[20px] glass-panel transition-all duration-200 hover:shadow-[0_6px_28px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
      {/* Top Main Row (Clickable Accordion) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 cursor-pointer select-none space-y-4 sm:space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Service info */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#f5f5f7] dark:bg-white/10 flex items-center justify-center text-[#48484a] dark:text-[#d1d1d6] mt-0.5 sm:mt-0 flex-shrink-0">
              <Globe className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[15px] tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {service.name}
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e5e5ea]/80 dark:bg-white/10 text-[#48484a] dark:text-[#d1d1d6]">
                  {service.region}
                </span>
              </div>
              {service.description && (
                <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                  {service.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Static Latency Badge (Public Read-Only) & Status Pill */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Read-Only Latency badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f5f5f7] dark:bg-white/10 text-[#1d1d1f] dark:text-[#f5f5f7] border border-[#e5e5ea]/80 dark:border-transparent"
              title={`${t.avgLatency}: ${service.currentLatency}ms`}
            >
              <Zap className="w-3 h-3 text-[#86868b] dark:text-[#a1a1a6]" />
              <span>{service.currentLatency} ms</span>
            </div>

            {/* Uptime % */}
            <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#a1a1a6] hidden md:block">
              {service.uptime90d}%
            </span>

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} ${service.status === 'operational' ? 'animate-pulse' : ''}`} />
              {badge.label}
            </span>

            {/* Chevron icon */}
            <ChevronDown
              className={`w-4 h-4 text-[#86868b] transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Timeline Bar Strip */}
        <div>
          <TimelineBar history={service.history90d} daysCount={timelineDays} t={t} />
        </div>
      </div>

      {/* Expandable Drawer for Details */}
      {isExpanded && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-[#e5e5ea]/80 dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-black/20 rounded-b-[20px] overflow-hidden space-y-4 animate-in fade-in duration-200">
          {/* Sparkline */}
          <LatencySparkline
            data={service.recentLatencies}
            color={service.status === 'operational' ? '#34c759' : '#ff9500'}
            t={t}
          />

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-[#e5e5ea]/80 dark:border-white/[0.05]">
              <span className="text-[#86868b] dark:text-[#a1a1a6]">{t.endpointTarget}</span>
              <div className="font-mono text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 truncate">
                {service.endpointUrl || 'https://edge.api/health'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-[#e5e5ea]/80 dark:border-white/[0.05]">
              <span className="text-[#86868b] dark:text-[#a1a1a6]">{t.probeFreq}</span>
              <div className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mt-1">
                {t.probeFreqValue}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-[#e5e5ea]/80 dark:border-white/[0.05]">
              <span className="text-[#86868b] dark:text-[#a1a1a6]">{t.probeProtocol}</span>
              <div className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mt-1">
                {t.probeProtocolValue}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
