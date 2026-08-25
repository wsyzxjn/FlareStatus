import { SystemStatusData, CategoryConfig } from './types';

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'default',
    name: '默认分类 (Default)',
    shortName: '默认',
    description: '基础服务与 API 端点',
    icon: 'server',
  },
];

export const INITIAL_STATUS_DATA: SystemStatusData = {
  systemStatus: 'no_data',
  headline: 'Awaiting First Probe',
  subtitle: 'Scheduled edge telemetry and service health',
  lastUpdated: new Date().toISOString(),
  overallUptime90d: 0,
  avgLatencyMs: 0,
  totalProbesToday: 0,
  activeRegionsCount: 0,
  categories: [],
  activeIncidents: [],
  pastIncidents: [],
};
