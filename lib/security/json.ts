/**
 * JSON value validation.
 *
 * Values written to `jsonb` columns (audit metadata, alert payloads) must be
 * JSON-serializable. Validating client-supplied metadata against this schema
 * means a request can never store a value Postgres would reject — or worse,
 * something that round-trips back out looking different than it went in.
 *
 * @module lib/security/json
 */
import { z } from 'zod';
import type { Json } from '@/lib/supabase/rows';

export const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** An object of JSON values, as accepted by a `jsonb` column. */
export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
