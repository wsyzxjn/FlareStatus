import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, runScheduled, testables } from '../server/core.js';
import { createBlobTelemetry } from '../server/telemetry-blob.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  const stats = { reads: 0, writes: 0, deletes: 0 };
  return {
    stats,
    get: async (key) => {
      stats.reads += 1;
      return values.get(key) ?? null;
    },
    put: async (key, value) => {
      stats.writes += 1;
      values.set(key, value);
    },
    delete: async (key) => {
      stats.deletes += 1;
      values.delete(key);
    },
    raw: values,
  };
}

/** Wire an app over a single in-memory store, mirroring the EdgeOne adapter. */
function memoryApp(seed = {}, options = {}) {
  const storage = memoryStorage(seed);
  const telemetry = createBlobTelemetry(storage);
  return { storage, telemetry, handle: createApp({ storage, telemetry, ...options }) };
}

test('normalizes timestamp service ids without throwing', () => {
  assert.equal(testables.normalizeCreatedAt({ id: 'svc-1700000000000' }), '2023-11-14T22:13:20.000Z');
  assert.equal(testables.normalizeCreatedAt({ id: 'svc-invalid' }, '2026-01-01T00:00:00.000Z'), '2026-01-01T00:00:00.000Z');
});

test('rejects local and private probe targets', () => {
  for (const target of ['http://localhost', 'http://127.0.0.1', 'http://10.0.0.1', 'http://192.168.1.1', 'http://172.16.0.1']) {
    assert.throws(() => testables.validateTargetURL(target));
  }
  assert.equal(testables.validateTargetURL('https://example.com/health'), 'https://example.com/health');
});

test('overall status reflects probe outages', () => {
  assert.equal(testables.worstStatus([{ status: 'outage' }], []), 'outage');
  assert.equal(testables.worstStatus([{ status: 'operational' }], []), 'operational');
  assert.equal(testables.worstStatus([], []), 'no_data');
});

test('uptime excludes no-data days', () => {
  assert.equal(testables.calculateUptime([
    { status: 'no_data', uptime: 0 },
    { status: 'operational', uptime: 100 },
    { status: 'outage', uptime: 50 },
  ]), 75);
});

test('admin API fails closed without a Passkey session', async () => {
  const { handle } = memoryApp({}, { setupToken: 'test-setup-token' });
  const response = await handle(new Request('https://status.example/api/admin/data'));
  assert.equal(response.status, 401);
});

test('public status never exposes push heartbeat tokens', async () => {
  const services = [{
    id: 'push-service',
    name: 'Backup',
    categoryId: 'default',
    url: 'push://push_do_not_expose',
    enabled: true,
    monitorType: 'push',
    pushToken: 'push_do_not_expose',
    createdAt: '2026-01-01T00:00:00.000Z',
  }];
  const { handle } = memoryApp({ 'config:services': JSON.stringify(services) });
  const response = await handle(new Request('https://status.example/api/status'));
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(await response.json()).includes('push_do_not_expose'), false);
});

test('service ids cannot be used as push credentials', async () => {
  const services = [{
    id: 'public-service-id',
    name: 'Backup',
    categoryId: 'default',
    url: 'push://secret',
    enabled: true,
    monitorType: 'push',
    pushToken: 'actual-secret',
    createdAt: '2026-01-01T00:00:00.000Z',
  }];
  const { handle } = memoryApp({ 'config:services': JSON.stringify(services) });
  const response = await handle(new Request('https://status.example/api/push/public-service-id'));
  assert.equal(response.status, 404);
});

// --- Storage quota regressions -------------------------------------------------
// A 2-minute cron fires 720 times/day. Any unconditional write in the scheduled
// path costs 720 writes/day, which alone is 72% of the Workers KV free tier.

test('a probe round with no services performs zero writes', async () => {
  const storage = memoryStorage({ 'config:services': JSON.stringify([]) });
  const telemetry = createBlobTelemetry(storage);

  const count = await runScheduled(storage, telemetry);

  assert.equal(count, 0);
  assert.equal(storage.stats.writes, 0, 'idle probe rounds must not write');
  assert.equal(storage.stats.deletes, 0);
});

test('a probe round with only disabled services performs zero writes', async () => {
  const services = [{
    id: 'svc-1',
    name: 'Disabled',
    categoryId: 'default',
    url: 'https://example.com',
    enabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }];
  const storage = memoryStorage({ 'config:services': JSON.stringify(services) });
  const telemetry = createBlobTelemetry(storage);

  assert.equal(await runScheduled(storage, telemetry), 0);
  assert.equal(storage.stats.writes, 0);
});

test('push heartbeats do not rewrite the shared service list', async () => {
  const services = [{
    id: 'push-service',
    name: 'Backup',
    categoryId: 'default',
    url: 'push://token',
    enabled: true,
    monitorType: 'push',
    pushToken: 'secret-token',
    createdAt: '2026-01-01T00:00:00.000Z',
  }];
  const serialized = JSON.stringify(services);
  const { handle, storage } = memoryApp({ 'config:services': serialized });

  const response = await handle(new Request('https://status.example/api/push/secret-token', { method: 'POST' }));
  assert.equal(response.status, 200);
  // Read-modify-writing config:services here let concurrent check-ins clobber
  // each other, so the heartbeat must land on its own key instead.
  assert.equal(storage.raw.get('config:services'), serialized);
  assert.deepEqual(Object.keys(JSON.parse(storage.raw.get('monitor:heartbeats'))), ['push-service']);
});

test('status badges are cacheable so README embeds do not recompute per view', async () => {
  const { handle } = memoryApp();
  const response = await handle(new Request('https://status.example/api/badge/overall'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control') ?? '', /max-age=\d+/);
  assert.doesNotMatch(response.headers.get('Cache-Control') ?? '', /no-store/);
});
