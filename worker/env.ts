import type { MonitorHub } from './monitor-hub';

export interface Env {
  MONITOR_HUB: DurableObjectNamespace<MonitorHub>;
  ADMIN_SETUP_TOKEN?: string;
  ASSETS?: Fetcher;
}
