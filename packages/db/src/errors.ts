// Drizzle wraps driver failures in a DrizzleQueryError and hangs the real
// PostgresError off .cause, so the SQLSTATE is never on the thrown error
// itself. Walk the chain to find it.
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error

  for (let depth = 0; current != null && depth < 5; depth++) {
    if (typeof current === 'object' && 'code' in current) {
      const code = (current as { code?: unknown }).code
      if (typeof code === 'string') return code
    }
    current = (current as { cause?: unknown }).cause
  }

  return undefined
}

// Thrown by the lowercased email index on signup, and by the partial unique
// index when a second active loan is attempted on one item.
export const isUniqueViolation = (error: unknown) => pgErrorCode(error) === '23505'

export const isCheckViolation = (error: unknown) => pgErrorCode(error) === '23514'

// 23001 is restrict_violation, raised by ON DELETE RESTRICT; 23503 is the
// plain foreign_key_violation. Every FK in this schema is RESTRICT, so a check
// for 23503 alone would miss the case that actually happens.
export const isForeignKeyViolation = (error: unknown) =>
  ['23001', '23503'].includes(pgErrorCode(error) ?? '')
