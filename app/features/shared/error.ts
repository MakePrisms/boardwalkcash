import type { PostgrestError } from '@supabase/supabase-js';

export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Unknown error. Please try again or contact support',
) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

export class UniqueConstraintError extends Error {
  constructor(postgresError: PostgrestError, message?: string) {
    if (postgresError.code !== '23505') {
      throw new Error('Expected a unique constraint error', {
        cause: postgresError,
      });
    }

    super(message ?? postgresError.message, { cause: postgresError });
  }
}
