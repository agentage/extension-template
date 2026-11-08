import { readFileSync } from 'node:fs';
import { createTestContext, startTestMcp } from '@agentage/extension';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { create } from './index.js';

const { version, agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { version: string; agentage: { id: string } };
const { id } = agentage;
let server: Awaited<ReturnType<typeof startTestMcp>>;
beforeAll(async () => {
  server = await startTestMcp({ create, ctx: createTestContext({ extension: { id, version } }) });
});
afterAll(() => server.close());

describe(`${id}__echo`, () => {
  it('declares scope read', () => {
    const ctx = createTestContext();
    create(ctx);
    expect(ctx.tools.map(({ name, spec }) => [name, spec.scope])).toEqual([['echo', 'read']]);
  });

  it('answers pong and the message', async () => {
    expect(await server.call('echo', { msg: 'hi' })).toEqual({ msg: 'pong hi' });
  });
});
