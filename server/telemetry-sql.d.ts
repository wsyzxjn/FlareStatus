import type { TelemetryAdapter } from './core';

export function initSchema(sql: SqlStorage): void;
export function createSqlTelemetry(sql: SqlStorage): TelemetryAdapter;
