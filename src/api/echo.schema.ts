import { z } from 'zod';

export const EchoSchema = z.object({
  msg: z.string().min(1).max(200),
});
