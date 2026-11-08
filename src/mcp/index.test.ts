import { readFileSync, writeFileSync } from 'node:fs';
import {
  canonical,
  createTestContext,
  mcpSnapshot,
  PROTOCOL_VERSIONS,
  startTestMcp,
} from '@agentage/extension';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { create } from './index.js';

const { version, agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { version: string; agentage: { id: string } };
const { id } = agentage;
const SNAPSHOT = new URL(`../../${id}.mcpc.json`, import.meta.url);
let server: Awaited<ReturnType<typeof startTestMcp>>;
beforeAll(async () => {
  server = await startTestMcp({ create, ctx: createTestContext({ extension: { id, version } }) });
});
afterAll(() => server.close());

describe(`${id}.mcpc.json`, () => {
  it.each(PROTOCOL_VERSIONS)('a %s client lists exactly the committed snapshot', async (proto) => {
    const snapshot = await mcpSnapshot(`${server.url}/mcp`, proto);
    if (process.env['UPDATE_SNAPSHOT'])
      writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
    expect(snapshot).toEqual(canonical(JSON.parse(readFileSync(SNAPSHOT, 'utf8'))));
  });
});

describe(`${id}__echo`, () => {
  it('declares scope read', () => {
    const ctx = createTestContext();
    create(ctx);
    expect(ctx.tools.map(({ name, spec }) => [name, spec.scope])).toEqual([['echo', 'read']]);
  });

  it('answers pong and the message', async () => {
    const res = await server.fetch('/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: `${id}__echo`, arguments: { msg: 'hi' } },
      }),
    });
    const data = (await res.text()).split('\n').find((line) => line.startsWith('data:')) ?? '';
    expect(JSON.parse(data.slice(5))).toMatchObject({
      result: { structuredContent: { msg: 'pong hi' } },
    });
  });
});
