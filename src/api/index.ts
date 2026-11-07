import { readFileSync } from 'node:fs';
import { Router } from 'express';
import { ok, parse, type PartContext } from '@agentage/extension';
import { EchoSchema } from './echo.schema.js';

// package.json ships in every image; without parts.store the ping route never queries.
const { agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { agentage: { parts: { store?: string } } };

const pings = async ({ store }: PartContext): Promise<number> => {
  const { rows } = await store.query<{ n: number }>('select count(*)::int as n from pings');
  const [count] = rows as [{ n: number }]; // count(*) answers one row
  return count.n;
};

// The kit mounts this router at /api/v1/; openapi.json is its contract.
export const create = (ctx: PartContext): Router => {
  const router = Router();
  router.get('/echo', (req, res) => {
    const { msg } = parse(EchoSchema, req.query, 'Invalid query');
    res.json(ok({ msg, caller: ctx.auth.caller(req)?.sub }));
  });
  router.get('/ping', async (_req, res) => {
    res.json(ok({ msg: 'pong', pings: agentage.parts.store ? await pings(ctx) : null }));
  });
  return router;
};
