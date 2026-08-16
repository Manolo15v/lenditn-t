import { describe, expect, test } from 'vitest'
import { loginInput, signupInput } from './validation.ts'

describe('signupInput', () => {
  test('trims the name and folds the email to lowercase', () => {
    const parsed = signupInput.parse({
      name: '  Ana  ',
      email: '  Ana@Uni.EDU  ',
      password: 'correct-horse',
    })

    expect(parsed.name).toBe('Ana')
    expect(parsed.email).toBe('ana@uni.edu')
  })

  test('drops passwordHash even when a client sends one', () => {
    const parsed = signupInput.parse({
      name: 'Ana',
      email: 'ana@uni.edu',
      password: 'correct-horse',
      passwordHash: '$argon2id$forged',
    })

    expect(parsed).not.toHaveProperty('passwordHash')
  })

  test('rejects a password under 8 characters', () => {
    const result = signupInput.safeParse({
      name: 'Ana',
      email: 'ana@uni.edu',
      password: 'short',
    })

    expect(result.success).toBe(false)
  })

  test('rejects a malformed email', () => {
    const result = signupInput.safeParse({
      name: 'Ana',
      email: 'not-an-email',
      password: 'correct-horse',
    })

    expect(result.success).toBe(false)
  })
})

describe('loginInput', () => {
  test('folds the email so a login matches however it was typed', () => {
    expect(loginInput.parse({ email: 'ANA@UNI.EDU', password: 'x' }).email).toBe('ana@uni.edu')
  })
})
