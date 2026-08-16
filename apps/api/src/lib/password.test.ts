import { describe, expect, test } from 'vitest'
import { DECOY_HASH, hashPassword, verifyPassword } from './password.ts'

describe('password hashing', () => {
  test('accepts the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct-horse')

    expect(stored).not.toContain('correct-horse')
    expect(stored.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(stored, 'correct-horse')).toBe(true)
    expect(await verifyPassword(stored, 'correct-hors')).toBe(false)
  })

  test('salts, so the same password never stores the same hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')])

    expect(a).not.toBe(b)
    expect(await verifyPassword(a, 'same-password')).toBe(true)
    expect(await verifyPassword(b, 'same-password')).toBe(true)
  })

  test('the decoy hash is verifiable, so an unknown email costs the same work', async () => {
    expect(await verifyPassword(DECOY_HASH, 'anything')).toBe(false)
  })
})
