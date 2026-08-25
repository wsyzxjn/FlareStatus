/**
 * SQLite-backed probe telemetry for Cloudflare Durable Objects.
 *
 * Replaces the previous Workers KV design, where every probe round rewrote a
 * whole per-service JSON blob. That cost one KV write per service per round
 * (720 rounds/day on a 2-minute cron), which does not fit the KV free tier of
 * 1,000 writes/day. Here each probe is a single row insert plus one aggregate
 * upsert, billed against the Durable Object SQLite allowance of 100,000 rows
 * written/day.
 */

const DAY_MS = 86_400_000;
const SAMPLE_RETENTION_MS = DAY_MS;
const DAILY_RETENTION_DAYS = 90;
const MAX_RECENT_SAMPLES = 720;

/** Ordered by severity; index doubles as the rank persisted in `daily.worst_rank`. */
const STATUS_BY_RANK = ['no_data', 'operational', 'degraded', 'maintenance', 'outage'];
const RANK_BY_STATUS = Object.fromEntries(STATUS_BY_RANK.map((status, rank) => [status, rank]));

function rankOf(status) {
  return RANK_BY_STATUS[status] ?? 0;
}

function statusOfRank(rank) {
  return STATUS_BY_RANK[rank] ?? 'no_data';
}

function placeholders(count) {
  return Array.from({ length: count }, () => '?').join(', ');
}

function emptyState() {
  return { latest: null, recent: [], days: {} };
}

function sampleFromRow(row) {
  const sample = {
    status: row.status,
    latency: row.latency,
    statusCode: row.status_code,
    timestamp: new Date(row.ts).toISOString(),
  };
  if (row.error) sample.error = row.error;
  return sample;
}

export function initSchema(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS samples (
      service_id  TEXT    NOT NULL,
      ts          INTEGER NOT NULL,
      status      TEXT    NOT NULL,
      latency     INTEGER NOT NULL DEFAULT 0,
      status_code INTEGER NOT NULL DEFAULT 0,
      error       TEXT,
      PRIMARY KEY (service_id, ts)
    );

    CREATE TABLE IF NOT EXISTS daily (
      service_id    TEXT    NOT NULL,
      date          TEXT    NOT NULL,
      total         INTEGER NOT NULL DEFAULT 0,
      healthy       INTEGER NOT NULL DEFAULT 0,
      latency_total INTEGER NOT NULL DEFAULT 0,
      worst_rank    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (service_id, date)
    );

    CREATE TABLE IF NOT EXISTS heartbeats (
      service_id TEXT    PRIMARY KEY,
      ts         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/**
 * @param {SqlStorage} sql Durable Object SQL storage handle.
 */
export function createSqlTelemetry(sql) {
  /** Trim raw samples to 24h and aggregates to 90 days. Runs at most once per day. */
  function pruneIfStale(nowMs) {
    const today = new Date(nowMs).toISOString().slice(0, 10);
    const current = sql.exec("SELECT value FROM meta WHERE key = 'last_prune_date'").toArray()[0];
    if (current?.value === today) return;

    sql.exec('DELETE FROM samples WHERE ts < ?', nowMs - SAMPLE_RETENTION_MS);
    sql.exec(
      'DELETE FROM daily WHERE date < ?',
      new Date(nowMs - DAILY_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10),
    );
    sql.exec(
      "INSERT INTO meta (key, value) VALUES ('last_prune_date', ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      today,
    );
  }

  return {
    /**
     * Persist a whole probe round. Two rows written per service, in one
     * implicit transaction, instead of a full-blob rewrite per service.
     * @param {{serviceId: string, sample: object}[]} entries
     */
    recordBatch(entries) {
      if (!entries.length) return;
      let now = 0;
      for (const { serviceId, sample } of entries) {
        const ts = Date.parse(sample.timestamp);
        now = Math.max(now, ts);
        sql.exec(
          'INSERT INTO samples (service_id, ts, status, latency, status_code, error) VALUES (?, ?, ?, ?, ?, ?) ' +
            'ON CONFLICT(service_id, ts) DO UPDATE SET ' +
            'status = excluded.status, latency = excluded.latency, ' +
            'status_code = excluded.status_code, error = excluded.error',
          serviceId,
          ts,
          sample.status,
          Number(sample.latency) || 0,
          Number(sample.statusCode) || 0,
          sample.error ?? null,
        );
        sql.exec(
          'INSERT INTO daily (service_id, date, total, healthy, latency_total, worst_rank) ' +
            'VALUES (?, ?, 1, ?, ?, ?) ' +
            'ON CONFLICT(service_id, date) DO UPDATE SET ' +
            'total = daily.total + 1, ' +
            'healthy = daily.healthy + excluded.healthy, ' +
            'latency_total = daily.latency_total + excluded.latency_total, ' +
            'worst_rank = MAX(daily.worst_rank, excluded.worst_rank)',
          serviceId,
          sample.timestamp.slice(0, 10),
          sample.status === 'outage' ? 0 : 1,
          Number(sample.latency) || 0,
          rankOf(sample.status),
        );
      }
      pruneIfStale(now || Date.now());
    },

    /**
     * Rebuild the `{latest, recent, days}` shape the API layer renders from.
     * Three queries total regardless of service count.
     * @param {string[]} serviceIds
     */
    getStates(serviceIds) {
      const states = new Map(serviceIds.map((id) => [id, emptyState()]));
      if (!serviceIds.length) return states;

      const slots = placeholders(serviceIds.length);
      const since = Date.now() - SAMPLE_RETENTION_MS;

      for (const row of sql
        .exec(
          `SELECT service_id, ts, status, latency, status_code, error FROM samples
           WHERE service_id IN (${slots}) AND ts >= ?
           ORDER BY ts ASC`,
          ...serviceIds,
          since,
        )
        .toArray()) {
        states.get(row.service_id)?.recent.push(sampleFromRow(row));
      }

      // `recent` drives a 24h sparkline; keep the newest window only.
      for (const state of states.values()) {
        if (state.recent.length > MAX_RECENT_SAMPLES) {
          state.recent = state.recent.slice(-MAX_RECENT_SAMPLES);
        }
      }

      // Latest probe may be older than the 24h sample window, so query it directly.
      for (const row of sql
        .exec(
          `SELECT s.service_id, s.ts, s.status, s.latency, s.status_code, s.error FROM samples s
           JOIN (SELECT service_id, MAX(ts) AS ts FROM samples
                 WHERE service_id IN (${slots}) GROUP BY service_id) latest
             ON latest.service_id = s.service_id AND latest.ts = s.ts`,
          ...serviceIds,
        )
        .toArray()) {
        const state = states.get(row.service_id);
        if (state) state.latest = sampleFromRow(row);
      }

      for (const row of sql
        .exec(
          `SELECT service_id, date, total, healthy, latency_total, worst_rank FROM daily
           WHERE service_id IN (${slots})`,
          ...serviceIds,
        )
        .toArray()) {
        const state = states.get(row.service_id);
        if (!state) continue;
        state.days[row.date] = {
          total: row.total,
          healthy: row.healthy,
          latencyTotal: row.latency_total,
          worst: statusOfRank(row.worst_rank),
        };
      }

      return states;
    },

    clear(serviceIds) {
      if (!serviceIds.length) return;
      const slots = placeholders(serviceIds.length);
      sql.exec(`DELETE FROM samples WHERE service_id IN (${slots})`, ...serviceIds);
      sql.exec(`DELETE FROM daily WHERE service_id IN (${slots})`, ...serviceIds);
      sql.exec(`DELETE FROM heartbeats WHERE service_id IN (${slots})`, ...serviceIds);
    },

    /** Race-free: a heartbeat no longer read-modify-writes the shared service list. */
    setHeartbeat(serviceId, timestamp) {
      sql.exec(
        'INSERT INTO heartbeats (service_id, ts) VALUES (?, ?) ' +
          'ON CONFLICT(service_id) DO UPDATE SET ts = excluded.ts',
        serviceId,
        Date.parse(timestamp),
      );
    },

    getHeartbeats() {
      const beats = {};
      for (const row of sql.exec('SELECT service_id, ts FROM heartbeats').toArray()) {
        beats[row.service_id] = new Date(row.ts).toISOString();
      }
      return beats;
    },

    /** Derived from stored samples, so the cron path needs no bookkeeping write. */
    lastRun() {
      const row = sql.exec('SELECT MAX(ts) AS ts FROM samples').toArray()[0];
      return row?.ts ? new Date(row.ts).toISOString() : null;
    },
  };
}
