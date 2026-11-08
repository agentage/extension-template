import { readFileSync } from 'node:fs';
import { ErrorEnvelopeSchema } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EchoSchema } from './echo.schema.js';

const FILE = new URL('../../openapi.json', import.meta.url);
const { version, agentage } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { version: string; agentage: { id: string } };
const { id } = agentage;

const json = (schema: z.ZodType): Record<string, unknown> => {
  const doc = { ...(z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>) };
  delete doc['$schema'];
  return doc;
};

const parameters = (schema: z.ZodObject) => {
  const { properties = {}, required = [] } = json(schema) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return Object.entries(properties).map(([name, s]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: s,
  }));
};

const ok = (data: z.ZodType) => ({
  description: 'the envelope',
  content: {
    'application/json': {
      schema: json(
        z.object({
          success: z.literal(true),
          data,
          meta: z.record(z.string(), z.unknown()).optional(),
        })
      ),
    },
  },
});

const invalid = {
  description: 'VALIDATION_ERROR',
  content: { 'application/json': { schema: json(ErrorEnvelopeSchema) } },
};

// The api's contract, generated from its Zod schemas; the kit serves the committed copy.
const generated = () => ({
  openapi: '3.1.0',
  info: { title: id, version },
  components: { securitySchemes: { pat: { type: 'http', scheme: 'bearer' } } },
  // The only place a route names its scope; the kit asks for it before the route runs.
  paths: {
    '/api/v1/echo': {
      get: {
        operationId: 'echo',
        security: [{ pat: [`${id}:read`] }],
        parameters: parameters(EchoSchema),
        responses: { '200': ok(z.object({ msg: z.string(), caller: z.string() })), '400': invalid },
      },
    },
    '/api/v1/ping': {
      get: {
        operationId: 'ping',
        security: [],
        responses: { '200': ok(z.object({ msg: z.string(), pings: z.int().nullable() })) },
      },
    },
  },
});

describe('openapi.json', () => {
  it('equals what the Zod schemas generate', () => {
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(generated());
  });
});
