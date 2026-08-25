import assert from 'node:assert/strict';
import test from 'node:test';
import { sqlTelemetry as telemetry } from './helpers.js';

const sample = (status, latency, timestamp, statusCode = 200) => ({
  status,
  latency,
  statusCode,
  timestamp,
});

test('records samples and rebuilds the monitor state shape', () => {
  const store = telemetry();
  const now = new Date().toISOString();

  store.recordBatch([{ serviceId: 'svc-a', sample: sample('operational', 120, now) }]);

  const state = store.getStates(['svc-a']).get('svc-a');
  assert.equal(state.latest.status, 'operational');
  assert.equal(state.latest.latency, 120);
  assert.equal(state.recent.length, 1);
  assert.equal(state.days[now.slice(0, 10)].total, 1);
  assert.equal(state.days[now.slice(0, 10)].healthy, 1);
});

test('daily aggregates accumulate and keep the worst status of the day', () => {
  const store = telemetry();
  const date = new Date().toISOString().slice(0, 10);
  const at = (minute) => `${date}T00:${String(minute).padStart(2, '0')}:00.000Z`;

  store.recordBatch([{ serviceId: 'svc-a', sample: sample('operational', 100, at(0)) }]);
  store.recordBatch([{ serviceId: 'svc-a', sample: sample('outage', 0, at(2), 0) }]);
  store.recordBatch([{ serviceId: 'svc-a', sample: sample('degraded', 900, at(4)) }]);

  const day = store.getStates(['svc-a']).get('svc-a').days[date];
  assert.equal(day.total, 3);
  assert.equal(day.healthy, 2, 'outages are the only unhealthy status');
  assert.equal(day.latencyTotal, 1000);
  assert.equal(day.worst, 'outage', 'worst status must not regress to a milder one');
});

test('isolates services from one another', () => {
  const store = telemetry();
  const now = new Date().toISOString();

  store.recordBatch([
    { serviceId: 'svc-a', sample: sample('operational', 100, now) },
    { serviceId: 'svc-b', sample: sample('outage', 0, now, 500) },
  ]);

  const states = store.getStates(['svc-a', 'svc-b']);
  assert.equal(states.get('svc-a').latest.status, 'operational');
  assert.equal(states.get('svc-b').latest.status, 'outage');
});

test('returns empty state for services that have never been probed', () => {
  const store = telemetry();
  const state = store.getStates(['unknown']).get('unknown');
  assert.deepEqual(state, { latest: null, recent: [], days: {} });
});

test('surfaces the latest sample even when it predates the 24h window', () => {
  const store = telemetry();
  const stale = new Date(Date.now() - 3 * 86_400_000).toISOString();

  store.recordBatch([{ serviceId: 'svc-a', sample: sample('degraded', 300, stale) }]);

  const state = store.getStates(['svc-a']).get('svc-a');
  assert.equal(state.recent.length, 0, 'sparkline only covers the last 24h');
  assert.equal(state.latest.status, 'degraded', 'last known status must still render');
});

test('heartbeats round-trip per service', () => {
  const store = telemetry();
  const now = new Date().toISOString();

  store.setHeartbeat('svc-a', now);
  assert.deepEqual(store.getHeartbeats(), { 'svc-a': now });

  const later = new Date(Date.now() + 60_000).toISOString();
  store.setHeartbeat('svc-a', later);
  assert.deepEqual(store.getHeartbeats(), { 'svc-a': later }, 'upsert, not duplicate');
});

test('lastRun is derived from stored samples instead of a bookkeeping write', () => {
  const store = telemetry();
  assert.equal(store.lastRun(), null);

  const now = new Date().toISOString();
  store.recordBatch([{ serviceId: 'svc-a', sample: sample('operational', 10, now) }]);
  assert.equal(store.lastRun(), now);
});

test('clear removes samples, aggregates and heartbeats for the given services', () => {
  const store = telemetry();
  const now = new Date().toISOString();
  store.recordBatch([
    { serviceId: 'svc-a', sample: sample('operational', 10, now) },
    { serviceId: 'svc-b', sample: sample('operational', 10, now) },
  ]);
  store.setHeartbeat('svc-a', now);

  store.clear(['svc-a']);

  assert.deepEqual(store.getStates(['svc-a']).get('svc-a'), { latest: null, recent: [], days: {} });
  assert.deepEqual(store.getHeartbeats(), {});
  assert.equal(store.getStates(['svc-b']).get('svc-b').latest.status, 'operational', 'other services untouched');
});

test('prunes raw samples beyond 24h and aggregates beyond 90 days', () => {
  const store = telemetry();
  const old = new Date(Date.now() - 120 * 86_400_000).toISOString();
  store.recordBatch([{ serviceId: 'svc-a', sample: sample('operational', 10, old) }]);

  // A later round on a different date triggers the daily prune pass.
  const now = new Date().toISOString();
  store.recordBatch([{ serviceId: 'svc-a', sample: sample('operational', 10, now) }]);

  const state = store.getStates(['svc-a']).get('svc-a');
  assert.equal(state.days[old.slice(0, 10)], undefined, '120-day-old aggregate pruned');
  assert.equal(state.days[now.slice(0, 10)].total, 1);
});

test('an empty batch writes nothing', () => {
  const store = telemetry();
  store.recordBatch([]);
  assert.equal(store.lastRun(), null);
});
