export type Language = 'en' | 'zh';

export interface Translations {
  navTitle: string;
  live: string;
  probeEdge: string;
  probingEdge: string;
  refresh: string;
  toggleThemeLight: string;
  toggleThemeDark: string;
  toggleLang: string;
  adminPortal: string;

  // Hero Status
  headlineOperational: string;
  headlineDegraded: string;
  headlineOutage: string;
  headlineMaintenance: string;
  subtitle: string;
  statusOperational: string;
  statusDegraded: string;
  statusOutage: string;
  statusMaintenance: string;

  // Metrics
  metricUptime: string;
  metricUptimeSLA: string;
  metricLatency: string;
  metricLatencySub: string;
  metricPoPs: string;
  metricPoPsSub: string;
  metricProbes: string;
  metricProbesSub: string;

  // Categories & Filters
  allServices: string;
  catCoreEdge: string;
  catCoreEdgeShort: string;
  catCoreEdgeDesc: string;
  catWebApps: string;
  catWebAppsShort: string;
  catWebAppsDesc: string;
  catDataStorage: string;
  catDataStorageShort: string;
  catDataStorageDesc: string;
  searchPlaceholder: string;
  days1: string;
  days7: string;
  days30: string;
  endpointsCount: string;
  noServicesFound: string;
  noServicesHint: string;

  // Service Card & Timeline
  daysAgo: string;
  hoursAgo: string;
  today: string;
  now: string;
  fullOperational: string;
  uptimeRate: string;
  dailyUptime: string;
  avgLatency: string;
  instantPingTitle: string;
  latencyTrendTitle: string;
  min: string;
  avg: string;
  max: string;
  endpointTarget: string;
  probeFreq: string;
  probeFreqValue: string;
  probeProtocol: string;
  probeProtocolValue: string;

  // Incidents
  incidentsTitle: string;
  resolvedIn: string;
  updatesCount: string;
  statusInvestigating: string;
  statusMonitoring: string;
  statusResolved: string;
  statusIdentified: string;

  // Footer
  serverlessBadge: string;
  jsonFeed: string;
  lastSync: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  zh: {
    navTitle: 'Cloudflare 服务状态',
    live: '运行中',
    probeEdge: '边缘测速',
    probingEdge: '测速中...',
    refresh: '刷新状态',
    toggleThemeLight: '切换为浅色模式',
    toggleThemeDark: '切换为深色模式',
    toggleLang: 'English',
    adminPortal: '管理后台',

    headlineOperational: '所有系统正常运行',
    headlineDegraded: '部分系统性能降级',
    headlineOutage: '核心系统发生故障',
    headlineMaintenance: '系统正在计划内维护',
    subtitle: '全球 310+ 边缘节点实时遥测与服务健康度',
    statusOperational: '全部正常',
    statusDegraded: '性能降级',
    statusOutage: '重大故障',
    statusMaintenance: '计划维护',

    metricUptime: '30 天可用率',
    metricUptimeSLA: 'SLA 目标: 99.9%',
    metricLatency: '边缘响应延迟',
    metricLatencySub: '全球 Anycast 节点均值',
    metricPoPs: '监控边缘节点',
    metricPoPsSub: 'Cloudflare 边缘城市',
    metricProbes: '今日探测次数',
    metricProbesSub: '每 2 分钟并发探测一次',

    allServices: '全部服务',
    catCoreEdge: '边缘核心基建',
    catCoreEdgeShort: '核心基建',
    catCoreEdgeDesc: '全球 Anycast 路由、SSL 终端加密与 API 边缘代理',
    catWebApps: 'Web 与客户端应用',
    catWebAppsShort: 'Web 应用',
    catWebAppsDesc: '客户控制台仪表盘、在线文档与开发者门户',
    catDataStorage: '数据与分布式存储',
    catDataStorageShort: '数据存储',
    catDataStorageDesc: 'KV 高速缓存、D1 关系型数据库与 R2 对象存储',
    searchPlaceholder: '搜索监控服务...',
    days1: '1天',
    days7: '7天',
    days30: '30天',
    endpointsCount: '个探测端点',
    noServicesFound: '未找到匹配的监控服务',
    noServicesHint: '请尝试输入其他关键词或重置分类筛选。',

    daysAgo: '天前',
    hoursAgo: '小时前',
    today: '今天',
    now: '刚刚',
    fullOperational: '100% 正常运行',
    uptimeRate: '可用率',
    dailyUptime: '当日可用率',
    avgLatency: '平均延迟',
    instantPingTitle: '从最近边缘节点即时测速',
    latencyTrendTitle: '24 小时响应延迟趋势',
    min: '最低',
    avg: '平均',
    max: '最高',
    endpointTarget: '监控目标端点',
    probeFreq: '边缘探测频率',
    probeFreqValue: '每 2 分钟并发探测 (Cron 调度)',
    probeProtocol: '探测协议',
    probeProtocolValue: 'HTTP/2 & HTTP/3 TLS 1.3',

    incidentsTitle: '最近 30 天事件与计划内维护',
    resolvedIn: '已解决',
    updatesCount: '次状态更新',
    statusInvestigating: '调查中',
    statusMonitoring: '监测中',
    statusResolved: '已恢复',
    statusIdentified: '已定位',

    serverlessBadge: '100% 无服务器边缘架构',
    jsonFeed: 'JSON 接口',
    lastSync: '上次同步',
  },
  en: {
    navTitle: 'Cloudflare Status',
    live: 'Live',
    probeEdge: 'Probe Edge',
    probingEdge: 'Probing Edge...',
    refresh: 'Refresh status',
    toggleThemeLight: 'Switch to Light Mode',
    toggleThemeDark: 'Switch to Dark Mode',
    toggleLang: '中文',
    adminPortal: 'Admin',

    headlineOperational: 'All Systems Operational',
    headlineDegraded: 'Degraded System Performance',
    headlineOutage: 'Major System Outage',
    headlineMaintenance: 'Under Scheduled Maintenance',
    subtitle: 'Real-time telemetry and edge health across all 310+ global locations',
    statusOperational: 'All Operational',
    statusDegraded: 'Degraded',
    statusOutage: 'Major Outage',
    statusMaintenance: 'Maintenance',

    metricUptime: '30-Day Uptime',
    metricUptimeSLA: 'Target SLA: 99.9%',
    metricLatency: 'Edge Latency',
    metricLatencySub: 'Global Anycast average',
    metricPoPs: 'Monitored PoPs',
    metricPoPsSub: 'Cloudflare Edge Cities',
    metricProbes: 'Probes Today',
    metricProbesSub: 'Every 2 mins per target',

    allServices: 'All Services',
    catCoreEdge: 'Core Edge Infrastructure',
    catCoreEdgeShort: 'Core Edge',
    catCoreEdgeDesc: 'Global Anycast routing, SSL termination, and API Edge proxies',
    catWebApps: 'Web & Client Applications',
    catWebAppsShort: 'Web & Apps',
    catWebAppsDesc: 'Customer management console, documentation, and client portals',
    catDataStorage: 'Data & Distributed Storage',
    catDataStorageShort: 'Data & Storage',
    catDataStorageDesc: 'Key-value cache, relational D1 database, and R2 object storage',
    searchPlaceholder: 'Filter services...',
    days1: '1D',
    days7: '7D',
    days30: '30D',
    endpointsCount: 'endpoints',
    noServicesFound: 'No matching services found',
    noServicesHint: 'Try searching for a different keyword or reset category filter.',

    daysAgo: 'days ago',
    hoursAgo: 'hours ago',
    today: 'Today',
    now: 'Now',
    fullOperational: '100% Operational',
    uptimeRate: 'Uptime',
    dailyUptime: 'Daily Uptime',
    avgLatency: 'Avg Latency',
    instantPingTitle: 'Click to ping from closest edge node',
    latencyTrendTitle: '24-Hour Response Latency',
    min: 'Min',
    avg: 'Avg',
    max: 'Max',
    endpointTarget: 'Endpoint Target',
    probeFreq: 'Edge Probe Frequency',
    probeFreqValue: 'Every 2 minutes (Cron Trigger)',
    probeProtocol: 'Probe Protocol',
    probeProtocolValue: 'HTTP/2 & HTTP/3 TLS 1.3',

    incidentsTitle: 'Past 30 Days Incidents & Maintenance',
    resolvedIn: 'Resolved in',
    updatesCount: 'updates',
    statusInvestigating: 'Investigating',
    statusMonitoring: 'Monitoring',
    statusResolved: 'Resolved',
    statusIdentified: 'Identified',

    serverlessBadge: '100% Serverless Edge',
    jsonFeed: 'JSON Feed',
    lastSync: 'Last sync',
  },
};
