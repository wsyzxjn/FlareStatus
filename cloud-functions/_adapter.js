import { getStore } from '@edgeone/pages-blob';
import { createApp } from '../server/core.js';
import { createBlobTelemetry } from '../server/telemetry-blob.js';

export function edgeOneHandler(context) {
  const store = getStore({ name: 'flarestatus-store', consistency: 'strong' });
  const storage = {
    async get(key) {
      return store.get(key, { type: 'text', consistency: 'strong' });
    },
    async put(key, value) {
      await store.set(key, value);
    },
    async delete(key) {
      await store.delete(key);
    },
  };
  const setupToken = context.env?.ADMIN_SETUP_TOKEN || globalThis.process?.env?.ADMIN_SETUP_TOKEN;
  return createApp({ storage, telemetry: createBlobTelemetry(storage), setupToken })(context.request);
}
