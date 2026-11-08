import { Router } from 'express';
import { ok, parse, type PartContext } from '@agentage/extension';
import { EchoSchema } from './echo.schema.js';

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
    res.json(ok({ msg: 'pong', pings: ctx.extension.store ? await countPings(ctx) : null }));
  });
  return router;
}
