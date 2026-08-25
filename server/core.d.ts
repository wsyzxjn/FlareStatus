export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ProbeSample {
  status: string;
  latency: number;
  statusCode: number;
  timestamp: string;
  error?: string;
}

export interface MonitorState {
  latest: ProbeSample | null;
  recent: ProbeSample[];
  days: Record<
    string,
    { total: number; healthy: number; latencyTotal: number; worst: string }
  >;
}

/**
 * Probe history storage. Split from {@link StorageAdapter} because this is the
 * write-hot path, and it is backed by SQL tables rather than JSON documents.
 */
export interface TelemetryAdapter {
  recordBatch(
    entries: { serviceId: string; sample: ProbeSample }[],
  ): void | Promise<void>;
  getStates(
    serviceIds: string[],
  ): Map<string, MonitorState> | Promise<Map<string, MonitorState>>;
  clear(serviceIds: string[]): void | Promise<void>;
  setHeartbeat(serviceId: string, timestamp: string): void | Promise<void>;
  getHeartbeats(): Record<string, string> | Promise<Record<string, string>>;
  lastRun(): string | null | Promise<string | null>;
}

export function createApp(options: {
  storage: StorageAdapter;
  telemetry: TelemetryAdapter;
  setupToken?: string;
}): (request: Request) => Promise<Response>;

export function runScheduled(
  storage: StorageAdapter,
  telemetry: TelemetryAdapter,
): Promise<number>;
