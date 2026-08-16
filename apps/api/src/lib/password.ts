import { hash, verify } from '@node-rs/argon2'

// OWASP argon2id baseline: 19 MiB, 2 iterations, 1 lane.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

export const hashPassword = (password: string) => hash(password, OPTIONS)

export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password, OPTIONS)

// Verified against when the email is unknown, so a missing account costs the
// same time as a wrong password and cannot be probed for.
export const DECOY_HASH = await hashPassword('decoy-for-constant-time-login')
