import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/core.js';
import { createSqlTelemetry, initSchema } from '../server/telemetry-sql.js';

/**
 * Minimal stand-in for the Durable Object `SqlStorage` API, backed by
 * `node:sqlite`. Both expose `exec(query, ...bindings)` returning a cursor with
 * `toArray()`, which is all the telemetry layer uses.
 *
 * @param {{writes: number}} [counters] Counts mutating statements, so tests can
 *   assert how many rows a probe round costs against the free-tier allowance.
 */
export function sqlStorage(counters) {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query, ...bindings) {
      if (!bindings.length && query.trim().includes(';')) {
        db.exec(query);
        return { toArray: () => [] };
      }
      if (counters && /^\s*(INSERT|UPDATE|DELETE)/i.test(query)) counters.writes += 1;
      const rows = db.prepare(query).all(...bindings);
      return { toArray: () => rows };
    },
  };
}

export function sqlTelemetry(counters) {
  const sql = sqlStorage(counters);
  initSchema(sql);
  return createSqlTelemetry(sql);
}

/**
 * The full request handler over the same storage split production uses: SQL
 * tables for probe history, key-value documents for config and auth.
 */
export function harness({ documents = {}, setupToken } = {}) {
  const counters = { writes: 0 };
  const telemetry = sqlTelemetry(counters);

  const docs = new Map(Object.entries(documents));
  const stats = { reads: 0, writes: 0, deletes: 0 };
  const storage = {
    get: async (key) => {
      stats.reads += 1;
      return docs.get(key) ?? null;
    },
    put: async (key, value) => {
      stats.writes += 1;
      docs.set(key, value);
    },
    delete: async (key) => {
      stats.deletes += 1;
      docs.delete(key);
    },
  };

  return {
    storage,
    telemetry,
    docs,
    stats,
    counters,
    handle: createApp({ storage, telemetry, setupToken }),
    seedServices: (services) => docs.set('config:services', JSON.stringify(services)),
  };
}

export const pushService = (id, token) => ({
  id,
  name: `Service ${id}`,
  categoryId: 'default',
  url: `push://${token}`,
  enabled: true,
  monitorType: 'push',
  pushToken: token,
  heartbeatInterval: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
});
