import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, testables } from '../server/core.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value) => { values.set(key, value); },
    delete: async (key) => { values.delete(key); },
  };
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
  const handle = createApp({ storage: memoryStorage(), setupToken: 'test-setup-token' });
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
  const handle = createApp({ storage: memoryStorage({ 'config:services': JSON.stringify(services) }) });
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
  const handle = createApp({ storage: memoryStorage({ 'config:services': JSON.stringify(services) }) });
  const response = await handle(new Request('https://status.example/api/push/public-service-id'));
  assert.equal(response.status, 404);
});
