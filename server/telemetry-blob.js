/**
 * Document-store probe telemetry, used by EdgeOne Pages (Blob storage) and by
 * the local in-memory dev server.
 *
 * Keeps the historical `{latest, recent, days}` document shape. This is a
 * read-modify-write design, so it is only appropriate on stores with strong
 * consistency and no per-day write quota. The Cloudflare deployment uses
 * `telemetry-sql.js` instead.
 */

const DAY_MS = 86_400_000;
const DAILY_RETENTION_DAYS = 90;
const MAX_RECENT_SAMPLES = 720;

const STATUS_RANK = { no_data: 0, operational: 1, degraded: 2, maintenance: 3, outage: 4 };

function emptyState() {
  return { latest: null, recent: [], days: {} };
}

/**
 * @param {{get: (key: string) => Promise<string|null>, put: (key: string, value: string) => Promise<void>, delete: (key: string) => Promise<void>}} store
 */
export function createBlobTelemetry(store) {
  async function read(key, fallback) {
    const raw = await store.get(key);
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  const write = (key, value) => store.put(key, JSON.stringify(value));

  async function getState(serviceId) {
    const state = await read(`monitor:${serviceId}`, emptyState());
    return {
      latest: state.latest ?? null,
      recent: Array.isArray(state.recent) ? state.recent : [],
      days: state.days && typeof state.days === 'object' ? state.days : {},
    };
  }

  return {
    async recordBatch(entries) {
      if (!entries.length) return;
      const retentionStart = new Date(Date.now() - DAILY_RETENTION_DAYS * DAY_MS)
        .toISOString()
        .slice(0, 10);

      await Promise.all(
        entries.map(async ({ serviceId, sample }) => {
          const state = await getState(serviceId);
          const recent = [...state.recent, sample]
            .filter((item) => Date.parse(item.timestamp) >= Date.now() - DAY_MS)
            .slice(-MAX_RECENT_SAMPLES);

          const date = sample.timestamp.slice(0, 10);
          const previous = state.days[date] ?? {
            total: 0,
            healthy: 0,
            latencyTotal: 0,
            worst: 'operational',
          };
          const day = {
            total: previous.total + 1,
            healthy: previous.healthy + (sample.status === 'outage' ? 0 : 1),
            latencyTotal: previous.latencyTotal + (Number(sample.latency) || 0),
            worst:
              STATUS_RANK[sample.status] > STATUS_RANK[previous.worst]
                ? sample.status
                : previous.worst,
          };
          const days = Object.fromEntries(
            Object.entries({ ...state.days, [date]: day }).filter(([key]) => key >= retentionStart),
          );
          await write(`monitor:${serviceId}`, { latest: sample, recent, days });
        }),
      );

      await write('monitor:meta', { lastRun: new Date().toISOString() });
    },

    async getStates(serviceIds) {
      const states = await Promise.all(serviceIds.map((id) => getState(id)));
      return new Map(serviceIds.map((id, index) => [id, states[index]]));
    },

    async clear(serviceIds) {
      await Promise.all(serviceIds.map((id) => store.delete(`monitor:${id}`)));
    },

    async setHeartbeat(serviceId, timestamp) {
      const beats = await read('monitor:heartbeats', {});
      await write('monitor:heartbeats', { ...beats, [serviceId]: timestamp });
    },

    getHeartbeats() {
      return read('monitor:heartbeats', {});
    },

    async lastRun() {
      const meta = await read('monitor:meta', {});
      return meta.lastRun ?? null;
    },
  };
}
