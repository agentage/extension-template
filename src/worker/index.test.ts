import { createTestContext } from '@agentage/extension';
import { describe, expect, it, vi } from 'vitest';
import { create } from './index.js';

describe('worker tick', () => {
  it('schedules tick every minute with a 30 s timeout', () => {
    const ctx = createTestContext();
    const schedule = vi.fn<typeof ctx.schedule>();
    create({ ...ctx, schedule });
    expect(schedule.mock.calls.map(([name, cron, , options]) => [name, cron, options])).toEqual([
      ['tick', '* * * * *', { timeout: '30s' }],
    ]);
  });

  it('logs its tick into the run and touches no store', async () => {
    const ctx = createTestContext();
    create(ctx);
    const run = await ctx.runJob('tick');
    expect(run).toMatchObject({ job: 'tick', status: 'ok', log: 'info tick\n', timeoutMs: 30_000 });
  });
});
