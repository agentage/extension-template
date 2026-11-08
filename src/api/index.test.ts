import type fs from 'node:fs';
import { readFileSync } from 'node:fs';
import {
  createTestContext,
  ErrorEnvelopeSchema,
  startTestServer,
  type PartContext,
  type Store,
} from '@agentage/extension';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { create } from './index.js';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const { agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { agentage: { parts: { store?: string } } };
const store = Boolean(agentage.parts.store);

const ctx = createTestContext({ store });
let server: Awaited<ReturnType<typeof startTestServer>>;
// The store boots (WASM, migrations, seed) on first use: here, not inside a test's 5 s.
beforeAll(async () => {
  if (store) await ctx.store.query('select 1');
  server = await startTestServer({ create, ctx });
}, 30_000);
afterAll(async () => {
  await server.close();
  await ctx.close();
});

describe('GET /api/v1/echo', () => {
  it('echoes msg and names the caller in the envelope, with an agcid', async () => {
    const res = await server.fetch('/api/v1/echo?msg=hi');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"success":true,"data":{"msg":"hi","caller":"usr_test"}}');
    expect(res.headers.get('agcid')).toMatch(UUID_V7);
  });

  it('keeps the caller agcid', async () => {
    const res = await server.fetch('/api/v1/echo?msg=hi', { headers: { agcid: 'echo-test-1' } });
    expect(res.headers.get('agcid')).toBe('echo-test-1');
  });

  it('answers VALIDATION_ERROR without msg', async () => {
    const res = await server.fetch('/api/v1/echo', { headers: { agcid: 'echo-test-2' } });
    expect(res.status).toBe(400);
    expect(ErrorEnvelopeSchema.parse(await res.json())).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query',
        agcid: 'echo-test-2',
        details: [{ field: 'msg', message: expect.any(String) }],
      },
    });
  });

  it('takes 200 characters, refuses an empty, repeated or oversized msg', async () => {
    expect((await server.fetch(`/api/v1/echo?msg=${'x'.repeat(200)}`)).status).toBe(200);
    for (const query of ['msg=', 'msg=a&msg=b', `msg=${'x'.repeat(201)}`]) {
      const res = await server.fetch(`/api/v1/echo?${query}`);
      expect(res.status, query).toBe(400);
    }
  });
});

// The api reads parts.store from package.json at import: each manifest gets a fresh module.
const ping = async (parts: object, ctx: PartContext = createTestContext()) => {
  vi.resetModules();
  vi.doMock('node:fs', async (real) => ({
    ...(await real<typeof fs>()),
    readFileSync: () => JSON.stringify({ agentage: { parts } }),
  }));
  const api = await import('./index.js');
  vi.doUnmock('node:fs');
  const one = await startTestServer({ create: api.create, ctx });
  const body: unknown = await (await one.fetch('/api/v1/ping')).json();
  await one.close();
  return body;
};

describe('GET /api/v1/ping', () => {
  it('counts the rows of pings when the manifest keeps the store', async () => {
    const counted = {
      ...createTestContext(),
      store: { query: async () => ({ rows: [{ n: 3 }] }) } as Store,
    };
    const body = await ping({ store: 'postgres' }, counted);
    expect(body).toEqual({ success: true, data: { msg: 'pong', pings: 3 } });
  });

  it('answers pings null and never queries without a store', async () => {
    expect(await ping({})).toEqual({ success: true, data: { msg: 'pong', pings: null } });
  });

  it.runIf(store)('counts the seeded row: the migration and the seed ran', async () => {
    const res = await server.fetch('/api/v1/ping');
    expect(await res.json()).toEqual({ success: true, data: { msg: 'pong', pings: 1 } });
  });
});
