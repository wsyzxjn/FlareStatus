import type { StorageAdapter, TelemetryAdapter } from './core';

export function createBlobTelemetry(store: StorageAdapter): TelemetryAdapter;
