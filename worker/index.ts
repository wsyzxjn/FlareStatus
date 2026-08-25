import { createApp, runScheduled } from '../server/core.js';

interface Env {
  STATUS_KV?: KVNamespace;
  ADMIN_SETUP_TOKEN?: string;
  ASSETS?: Fetcher;
}

const developmentMemory = new Map<string, string>();

function createStorage(env: Env) {
  return {
    async get(key: string): Promise<string | null> {
      return env.STATUS_KV ? env.STATUS_KV.get(key) : developmentMemory.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      if (env.STATUS_KV) await env.STATUS_KV.put(key, value);
      else developmentMemory.set(key, value);
    },
    async delete(key: string): Promise<void> {
      if (env.STATUS_KV) await env.STATUS_KV.delete(key);
      else developmentMemory.delete(key);
    },
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScheduled(createStorage(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const handle = createApp({
      storage: createStorage(env),
      setupToken: env.ADMIN_SETUP_TOKEN,
      assetsFetch: env.ASSETS ? (assetRequest: Request) => env.ASSETS!.fetch(assetRequest) : undefined,
    });
    return handle(request);
  },
};
