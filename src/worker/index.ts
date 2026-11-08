import { type WorkerContext } from '@agentage/extension';

// Every minute one log line; the kit never runs a job twice at once and saves each run.
export function create({ schedule, log }: WorkerContext) {
  schedule('tick', '* * * * *', async () => log.info('tick'), { timeout: '30s' });
}
