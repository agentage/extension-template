import { z } from 'zod';

// The echo query: one msg, 1 to 200 characters.
export const EchoSchema = z.object({
  msg: z.string().min(1).max(200),
});

export type Echo = z.infer<typeof EchoSchema>;
