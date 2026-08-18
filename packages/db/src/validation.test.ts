import { describe, expect, test } from 'vitest'
import { itemInput, loginInput, signupInput } from './validation.ts'

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

describe('itemInput', () => {
  test('a name is the only thing a listing needs', () => {
    // Lending is free by default, so the form never has to send a price. This
    // is the assertion that fails first if the column loses its default.
    const parsed = itemInput.parse({ name: 'TI-84 Plus' })

    expect(parsed.name).toBe('TI-84 Plus')
    expect(parsed.pricePerDayCents).toBeUndefined()
  })

  test('trims the name and refuses a blank one', () => {
    expect(itemInput.parse({ name: '  TI-84  ' }).name).toBe('TI-84')
    expect(itemInput.safeParse({ name: '   ' }).success).toBe(false)
  })

  test('drops ownerId even when a client sends one', () => {
    // The owner comes from the session. If this ever passes through, anyone can
    // list an item under someone else's name.
    expect(itemInput.parse({ name: 'X', ownerId: 'someone-else' })).not.toHaveProperty('ownerId')
  })

  test('refuses a price that is negative or fractional', () => {
    // int4 alone permits both; without these the check constraint turns a bad
    // request into a 500.
    expect(itemInput.safeParse({ name: 'X', pricePerDayCents: -1 }).success).toBe(false)
    expect(itemInput.safeParse({ name: 'X', pricePerDayCents: 1.5 }).success).toBe(false)
    expect(itemInput.safeParse({ name: 'X', pricePerDayCents: 0 }).success).toBe(true)
  })

  test('accepts an explicit null for the optional text columns', () => {
    const parsed = itemInput.parse({ name: 'X', description: null, category: null })

    expect(parsed.description).toBeNull()
    expect(parsed.category).toBeNull()
  })
})
