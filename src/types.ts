export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'no_data';

export interface LatencyPoint {
  time: string;
  latency: number;
}

export interface DayHistory {
  date: string; // YYYY-MM-DD
  status: ServiceStatus;
  uptime: number; // e.g. 100 or 99.4
  avgLatency: number; // ms
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

export type MonitorType = 'http' | 'keyword' | 'json_query' | 'port' | 'dns' | 'push';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface SslCertInfo {
  valid: boolean;
  daysRemaining?: number;
  validTo?: string;
  issuer?: string;
  expiresSoon?: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  categoryId: string;
  url: string;
  enabled: boolean;
  
  // Uptime Kuma Monitor Types & Protocols
  monitorType?: MonitorType;
  method?: HttpMethod;
  expectedStatus?: number;
  acceptedStatusCodes?: string;
  
  // SSL Certificate Expiry Alert
  checkSslCert?: boolean;
  sslExpiryDaysWarning?: number;
  
  // Passive Heartbeat / Push Monitor (Dead Man's Switch)
  pushToken?: string;
  heartbeatInterval?: number;
  lastHeartbeatPing?: string;
  
  // Keyword & JSON Query Matchers
  keywordMatch?: string;
  jsonPath?: string;
  expectedJsonValue?: string;
  
  // Advanced HTTP Request Options
  headers?: string;
  body?: string;
  authMethod?: 'none' | 'basic' | 'bearer';
  basicUser?: string;
  basicPass?: string;
  bearerToken?: string;
  ignoreTls?: boolean;
  upsideDown?: boolean;
  
  // Retries & Timing
  timeout?: number;
  maxRetries?: number;
  retryInterval?: number;
  
  // Per-Service Alert Routing
  notificationChannelIds?: string[];
  
  region?: string;
  description?: string;
  createdAt?: string;
}

export interface ServiceLiveState {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  status: ServiceStatus;
  monitorType?: MonitorType;
  currentLatency: number;
  uptime90d: number;
  lastChecked: string;
  region: string;
  endpointUrl?: string;
  description?: string;
  sslInfo?: SslCertInfo;
  lastHeartbeatPing?: string;
  pushToken?: string;
  createdAt?: string;
  recentLatencies: LatencyPoint[];
  history90d: DayHistory[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  icon?: string;
  services: ServiceLiveState[];
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

export type NotificationType = 'email' | 'webhook' | 'feishu' | 'telegram' | 'dingtalk' | 'wecom' | 'bark' | 'slack' | 'discord' | 'pushover';

export interface NotificationChannel {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  defaultEnabled?: boolean;
  
  // Trigger Condition Rules
  notifyOnDown?: boolean;
  notifyOnUp?: boolean;
  notifyOnDegraded?: boolean;
  notifyOnSslExpiry?: boolean;
  minFailuresBeforeAlert?: number;
  
  // Custom Alert Message & Payload Template
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

export interface SystemStatusData {
  systemStatus: ServiceStatus;
  headline: string;
  subtitle: string;
  lastUpdated: string;
  overallUptime90d: number;
  avgLatencyMs: number;
  totalProbesToday: number;
  activeRegionsCount: number;
  categories: ServiceCategory[];
  activeIncidents: Incident[];
  pastIncidents: Incident[];
}
