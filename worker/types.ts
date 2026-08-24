export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface LatencyPoint {
  time: string; // ISO string or HH:mm
  latency: number; // in ms
}

export interface DayHistory {
  date: string; // YYYY-MM-DD
  status: ServiceStatus;
  uptime: number; // e.g. 100 or 99.4
  avgLatency: number; // in ms
  incidentsCount?: number;
  note?: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  icon?: 'server' | 'globe' | 'database' | 'cpu' | 'cloud' | 'shield';
}

export type MonitorType = 'http' | 'keyword' | 'json_query' | 'port' | 'dns';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ServiceItem {
  id: string;
  name: string;
  categoryId: string;
  url: string;
  enabled: boolean;
  
  // Uptime Kuma Monitor Types & Protocols
  monitorType?: MonitorType; // http, keyword, json_query, port, dns
  method?: HttpMethod;
  expectedStatus?: number; // e.g. 200 or 200-299
  acceptedStatusCodes?: string; // e.g. "200-299,301,302"
  
  // Keyword & JSON Query Matchers
  keywordMatch?: string; // string that must be present in response
  jsonPath?: string; // e.g. "status.code"
  expectedJsonValue?: string; // e.g. "OK"
  
  // Advanced HTTP Request Options
  headers?: string; // custom headers in Key: Value format
  body?: string; // JSON or raw request body
  authMethod?: 'none' | 'basic' | 'bearer';
  basicUser?: string;
  basicPass?: string;
  bearerToken?: string;
  ignoreTls?: boolean;
  upsideDown?: boolean; // Invert status: 200 is down, error is up
  
  // Retries & Timing
  timeout?: number; // seconds (default 8)
  maxRetries?: number; // retry count before marking as down (default 1)
  retryInterval?: number; // seconds between retries
  
  // Per-Service Alert Routing (Uptime Kuma Alignment)
  // Specific notification channels bound to this service. If empty, all default channels apply.
  notificationChannelIds?: string[];
  
  region?: string;
  description?: string;
}

export interface ServiceLiveState {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  status: ServiceStatus;
  currentLatency: number;
  uptime90d: number;
  lastChecked: string;
  region: string;
  endpointUrl?: string;
  description?: string;
  recentLatencies: LatencyPoint[];
  history90d: DayHistory[];
}

export interface IncidentUpdate {
  time: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical' | 'maintenance';
  affectedServices: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

export type NotificationType = 'email' | 'webhook' | 'feishu' | 'telegram' | 'dingtalk' | 'wecom' | 'bark';

export interface NotificationChannel {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  defaultEnabled?: boolean; // applies to all services unless overridden
  
  // Trigger Condition Rules (Uptime Kuma Feature Alignment)
  notifyOnDown?: boolean; // trigger on failure
  notifyOnUp?: boolean; // trigger on recovery
  notifyOnDegraded?: boolean; // trigger on high latency / degradation
  minFailuresBeforeAlert?: number; // e.g. alert only after 2 consecutive failures
  
  // Custom Alert Message & Payload Template
  // Variables: {{SERVICE_NAME}}, {{STATUS}}, {{STATUS_EMOJI}}, {{TIME}}, {{LATENCY}}, {{HTTP_CODE}}, {{TARGET_URL}}, {{ERROR_MSG}}
  customTitleTemplate?: string;
  customBodyTemplate?: string;
  
  // Provider Specific Fields
  webhookUrl?: string;
  secretToken?: string;
  customHeaders?: string;
  
  // Email fields
  toEmail?: string;
  fromEmail?: string;
  emailProvider?: 'resend' | 'smtp' | 'sendgrid' | 'cf_email';
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
}

export interface GlobalSiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  targetSla: number;
  probeInterval: number; // in minutes
  historyRetentionDays: number;
  fontFamily?: 'jakarta' | 'sf-rounded' | 'system';
}

export interface AdminFullData {
  categories: CategoryConfig[];
  services: ServiceItem[];
  incidents: Incident[];
  notifications: NotificationChannel[];
  settings: GlobalSiteSettings;
}

export interface SystemStatusResponse {
  systemStatus: ServiceStatus;
  headline: string;
  lastUpdated: string;
  overallUptime90d: number;
  avgLatencyMs: number;
  categories: {
    id: string;
    name: string;
    shortName?: string;
    description?: string;
    icon?: string;
    services: ServiceLiveState[];
  }[];
  activeIncidents: Incident[];
  pastIncidents: Incident[];
}
