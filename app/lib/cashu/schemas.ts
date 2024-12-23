import { z } from 'zod';
import {
  type NUT10Secret,
  type NUT10SecretTag,
  WELL_KNOWN_SECRET_KINDS,
  type WellKnownSecretKind,
} from './types';

export const NUT10SecretTagSchema = z
  .array(z.string())
  .nonempty()
  .refine(
    (arr): arr is [string, ...string[]] => arr.length >= 1,
  ) satisfies z.ZodType<NUT10SecretTag>;

export const RawNUT10SecretSchema = z.tuple([
  z.enum(WELL_KNOWN_SECRET_KINDS),
  z.object({
    nonce: z.string(),
    data: z.string(),
    tags: z.array(NUT10SecretTagSchema).optional(),
  }),
]) satisfies z.ZodType<
  [
    WellKnownSecretKind,
    {
      nonce: NUT10Secret['nonce'];
      data: NUT10Secret['data'];
      tags?: NUT10Secret['tags'];
    },
  ]
>;
