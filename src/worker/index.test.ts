import { createTestContext } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

describe('worker tick', () => {
  it('logs tick into its run within the 30 s timeout', async () => {
    const ctx = createTestContext();
    create(ctx);
    const run = await ctx.runJob('tick');
    expect(run).toMatchObject({ job: 'tick', status: 'ok', log: 'info tick\n', timeoutMs: 30_000 });
  });
});
