import type fs from 'node:fs';
import { readFileSync } from 'node:fs';
import {
  createTestContext,
  ok,
  startTestServer,
  type PartContext,
  type Store,
} from '@agentage/extension';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { create } from './index.js';

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
  it('echoes msg and names the caller', async () => {
    const res = await server.fetch('/api/v1/echo?msg=hi');
    expect(await res.json()).toEqual(ok({ msg: 'hi', caller: 'usr_test' }));
  });

  it.each([
    ['empty', ''],
    ['over 200 characters', 'x'.repeat(201)],
  ])('refuses a msg %s', async (_name, msg) => {
    expect((await server.fetch(`/api/v1/echo?msg=${msg}`)).status).toBe(400);
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
    const counted = { query: async () => ({ rows: [{ n: 3 }] }) } as Store;
    const body = await ping({ store: 'postgres' }, { ...createTestContext(), store: counted });
    expect(body).toEqual(ok({ msg: 'pong', pings: 3 }));
  });

  it('answers pings null without a store', async () => {
    expect(await ping({})).toEqual(ok({ msg: 'pong', pings: null }));
  });

  it.runIf(store)('counts the seeded row: the migration and the seed ran', async () => {
    const res = await server.fetch('/api/v1/ping');
    expect(await res.json()).toEqual(ok({ msg: 'pong', pings: 1 }));
  });
});
