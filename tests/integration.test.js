import assert from 'node:assert/strict';
import test from 'node:test';
import { runScheduled } from '../server/core.js';
import { harness, pushService } from './helpers.js';

/**
 * End-to-end exercise of the storage path: the real `createApp` router over the
 * real SQL telemetry layer. Also counts mutating statements per probe round,
 * which is the number that has to stay inside the Durable Object free-tier
 * allowance of 100,000 rows written/day.
 */

test('probe results flow through to the public status feed', async () => {
  const app = harness();
  app.seedServices([pushService('svc-a', 'token-a')]);

  // A fresh push monitor with no heartbeat is expected to read as down.
  assert.equal(await runScheduled(app.storage, app.telemetry), 1);

  let payload = await (await app.handle(new Request('https://s.example/api/status'))).json();
  let service = payload.categories.flatMap((c) => c.services)[0];
  assert.equal(service.status, 'outage');
  assert.equal(payload.systemStatus, 'outage');

  // Check in, then re-probe: the heartbeat must flip the service healthy.
  const push = await app.handle(new Request('https://s.example/api/push/token-a', { method: 'POST' }));
  assert.equal(push.status, 200);
  await runScheduled(app.storage, app.telemetry);

  payload = await (await app.handle(new Request('https://s.example/api/status'))).json();
  service = payload.categories.flatMap((c) => c.services)[0];
  assert.equal(service.status, 'operational');
  assert.equal(payload.systemStatus, 'operational');
  assert.ok(service.recentLatencies.length >= 1, 'sparkline receives samples');
  assert.equal(service.history90d.length, 90, 'timeline always spans 90 days');
  assert.ok(service.uptime90d > 0);
});

test('metrics and badge endpoints reflect stored telemetry', async () => {
  const app = harness();
  app.seedServices([pushService('svc-a', 'token-a')]);
  await app.handle(new Request('https://s.example/api/push/token-a', { method: 'POST' }));
  await runScheduled(app.storage, app.telemetry);

  const metrics = await (await app.handle(new Request('https://s.example/metrics'))).text();
  assert.match(metrics, /probe_success\{service="svc-a"/);
  assert.match(metrics, /probe_success\{[^}]*\} 1/);

  const badge = await app.handle(new Request('https://s.example/api/badge/svc-a'));
  assert.equal(badge.headers.get('Content-Type'), 'image/svg+xml; charset=utf-8');
  assert.match(await badge.text(), /up 100%/);
});

test('clearing service data wipes telemetry', async () => {
  const app = harness();
  app.seedServices([pushService('svc-a', 'token-a')]);
  await runScheduled(app.storage, app.telemetry);

  await app.telemetry.clear(['svc-a']);

  assert.deepEqual(app.telemetry.getStates(['svc-a']).get('svc-a'), {
    latest: null,
    recent: [],
    days: {},
  });
});

// --- Quota accounting ----------------------------------------------------------

test('an idle probe round costs zero row writes', async () => {
  const app = harness();
  app.seedServices([]);

  await runScheduled(app.storage, app.telemetry);

  assert.equal(app.counters.writes, 0);
});

test('a probe round costs two row writes per service', async () => {
  const app = harness();
  const services = Array.from({ length: 5 }, (_, i) => pushService(`svc-${i}`, `token-${i}`));
  app.seedServices(services);

  // Warm-up round absorbs the once-a-day prune bookkeeping.
  await runScheduled(app.storage, app.telemetry);
  app.counters.writes = 0;

  await runScheduled(app.storage, app.telemetry);

  // One `samples` insert plus one `daily` upsert per service.
  assert.equal(app.counters.writes, services.length * 2);

  // 720 rounds/day on the 2-minute cron must stay well inside the Durable
  // Object SQLite free tier of 100,000 rows written/day.
  const rowsPerDay = app.counters.writes * 720;
  assert.equal(rowsPerDay, 7_200);
  assert.ok(rowsPerDay < 100_000, `${rowsPerDay} rows/day must fit the free tier`);
});
