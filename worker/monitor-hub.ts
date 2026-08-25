import { DurableObject } from 'cloudflare:workers';
import { createApp, runScheduled } from '../server/core.js';
import { createSqlTelemetry, initSchema } from '../server/telemetry-sql.js';
import type { StorageAdapter } from '../server/core';
import type { Env } from './env';

/** Sessions and challenges carry their own expiry; sweep them once a day. */
const AUTH_PREFIXES = ['auth:session:', 'auth:challenge:'];

/**
 * Single hub instance that owns all FlareStatus state in its embedded SQLite
 * database. Probe history lives in real tables (`telemetry-sql.js`) and the
 * remaining config/auth documents use the Durable Object key-value API.
 *
 * Nothing here touches Workers KV, so the 1,000 writes/day free-tier ceiling no
 * longer applies. The SQLite allowance is 100,000 rows written/day.
 */
export class MonitorHub extends DurableObject<Env> {
  #handle: (request: Request) => Promise<Response>;
  #telemetry: ReturnType<typeof createSqlTelemetry>;
  #storage: StorageAdapter;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    initSchema(ctx.storage.sql);
    this.#telemetry = createSqlTelemetry(ctx.storage.sql);

    // Config and auth documents stay as JSON blobs, but on Durable Object
    // storage rather than KV: strongly consistent and not KV-quota billed.
    this.#storage = {
      get: async (key) => (await ctx.storage.get<string>(key)) ?? null,
      put: async (key, value) => {
        await ctx.storage.put(key, value);
      },
      delete: async (key) => {
        await ctx.storage.delete(key);
      },
    };

    this.#handle = createApp({
      storage: this.#storage,
      telemetry: this.#telemetry,
      setupToken: env.ADMIN_SETUP_TOKEN,
    });
  }

  override fetch(request: Request): Promise<Response> {
    return this.#handle(request);
  }

  /** Invoked by the Worker cron trigger. Returns the number of services probed. */
  async runProbes(): Promise<number> {
    const count = await runScheduled(this.#storage, this.#telemetry);
    await this.#sweepExpiredAuth();
    return count;
  }

  /**
   * Drop expired passkey sessions and challenges. Previously these were written
   * to KV with no TTL and leaked forever.
   */
  async #sweepExpiredAuth(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if ((await this.ctx.storage.get<string>('auth:last-sweep')) === today) return;

    const now = Date.now();
    const stale: string[] = [];
    for (const prefix of AUTH_PREFIXES) {
      const entries = await this.ctx.storage.list<string>({ prefix });
      for (const [key, raw] of entries) {
        try {
          const value = JSON.parse(raw);
          if (typeof value?.expiresAt === 'number' && value.expiresAt <= now) stale.push(key);
        } catch {
          stale.push(key);
        }
      }
    }
    if (stale.length) await this.ctx.storage.delete(stale);
    await this.ctx.storage.put('auth:last-sweep', today);
  }
}
