import { readFileSync } from 'node:fs';
import { Router } from 'express';
import { ok, parse, type PartContext } from '@agentage/extension';
import { EchoSchema } from './echo.schema.js';

// Without parts.store in package.json the ping route never queries.
const { agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { agentage: { parts: { store?: string } } };

const countPings = async ({ store }: PartContext) => {
  const { rows } = await store.query<{ n: number }>('select count(*)::int as n from pings');
  const [{ n }] = rows as [{ n: number }]; // count(*) answers one row
  return n;
};

// Mounted at /api/v1; openapi.json declares each route's scope.
export function create(ctx: PartContext) {
  const router = Router();
  router.get('/echo', (req, res) => {
    const { msg } = parse(EchoSchema, req.query, 'Invalid query');
    res.json(ok({ msg, caller: ctx.auth.caller(req)?.sub }));
  });
  router.get('/ping', async (_req, res) => {
    res.json(ok({ msg: 'pong', pings: agentage.parts.store ? await countPings(ctx) : null }));
  });
  return router;
}
