import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import { Incident } from '../types';
import { Translations } from '../i18n';

interface IncidentSectionProps {
  activeIncidents: Incident[];
  pastIncidents: Incident[];
  t: Translations;
}

export const IncidentSection: React.FC<IncidentSectionProps> = ({
  activeIncidents,
  pastIncidents,
  t,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    pastIncidents.length > 0 ? pastIncidents[0].id : null
  );

  const getSeverityBadge = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'major':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'maintenance':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:border-white/10';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
  };

  const getStatusLabel = (status: Incident['status']) => {
    switch (status) {
      case 'investigating':
        return t.statusInvestigating;
      case 'identified':
        return t.statusIdentified;
      case 'monitoring':
        return t.statusMonitoring;
      case 'resolved':
      default:
        return t.statusResolved;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#48484a] dark:text-[#d1d1d6] stroke-[1.75]" />
          <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            {t.incidentsTitle}
          </h2>
        </div>
      </div>

      {/* Active Incidents Banner */}
      {activeIncidents.length > 0 && (
        <div className="space-y-3">
          {activeIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-[20px] glass-panel border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#ff9500] dark:text-[#ff9f0a]" />
                  <span className="font-semibold text-[#1d1d1f] dark:text-white">
                    {inc.title}
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full uppercase font-bold border ${getSeverityBadge(
                    inc.severity
                  )}`}
                >
                  {getStatusLabel(inc.status)}
                </span>
              </div>
              <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-500/10">
                {inc.updates.map((upd, idx) => (
                  <div key={idx} className="text-xs space-y-0.5">
                    <span className="font-mono text-[#86868b]">{upd.time}</span>
                    <p className="text-[#1d1d1f] dark:text-neutral-300">{upd.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Incidents List */}
      {pastIncidents.length > 0 ? (
        <div className="rounded-[20px] glass-panel overflow-hidden divide-y divide-[#e5e5ea]/80 dark:divide-white/[0.08]">
          {pastIncidents.map((incident) => {
            const isExpanded = expandedId === incident.id;

            return (
              <div key={incident.id} className="transition-colors">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#f5f5f7]/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#f5f5f7] dark:bg-white/10 flex items-center justify-center text-[#48484a] dark:text-[#d1d1d6] flex-shrink-0">
                      {incident.severity === 'maintenance' ? (
                        <Wrench className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#34c759] dark:text-[#30d158] stroke-[1.75]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {incident.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                        <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>
                          {t.resolvedIn} {incident.updates.length} {t.updatesCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getSeverityBadge(
                        incident.severity
                      )}`}
                    >
                      {incident.severity}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#86868b] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Updates timeline */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 space-y-3 bg-[#fbfbfd] dark:bg-white/[0.01]">
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#e5e5ea] dark:before:bg-neutral-800">
                      {incident.updates.map((update, idx) => (
                        <div key={idx} className="relative text-xs space-y-1">
                          <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#34c759] border-2 border-white dark:border-neutral-900" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1d1d1f] dark:text-neutral-200 uppercase text-[10px]">
                              {getStatusLabel(update.status)}
                            </span>
                            <span className="font-mono text-[#86868b] text-[11px]">
                              {update.time}
                            </span>
                          </div>
                          <p className="text-[#48484a] dark:text-neutral-300 leading-relaxed">
                            {update.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl glass-panel text-xs text-[#86868b] dark:text-[#a1a1a6]">
          {t.resolvedIn ? '过去 30 天内无故障或计划内维护事件，所有系统稳定运行。' : 'No incidents or maintenance windows recorded in the past 30 days.'}
        </div>
      )}
    </section>
  );
};
