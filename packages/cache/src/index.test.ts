import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, test, vi } from 'vitest'
import { createCache } from './index.ts'

const MINUTE = 60_000
const testPrefix = () => `lendit-test:${randomUUID()}:`

describe('with no url', () => {
  const cache = createCache(undefined)

  test('it is off, and every read goes to the loader', async () => {
    const load = vi.fn(async () => 'fresh')

    expect(await cache.remember('k', MINUTE, load)).toBe('fresh')
    expect(await cache.remember('k', MINUTE, load)).toBe('fresh')
    expect(load).toHaveBeenCalledTimes(2)
    expect(await cache.status()).toBe('off')
  })
})

describe('when valkey is unreachable', () => {
  const cache = createCache('redis://127.0.0.1:1', { onError: () => {} })
  afterAll(() => cache.close())

  test('reads fall through to the loader and nothing throws', async () => {
    const load = vi.fn(async () => ({ id: 'x' }))

    expect(await cache.remember('k', MINUTE, load)).toEqual({ id: 'x' })
    expect(await cache.read('k')).toBeUndefined()
    await cache.write('k', 1, MINUTE)
    await cache.forget('k')
    expect(await cache.status()).toBe('down')
    expect(await cache.flush()).toBeNull()
  })
})

const live = createCache(process.env.REDIS_URL, { prefix: testPrefix() })
const reachable = await live.ready(2_000)

describe.skipIf(!process.env.CI && !reachable)('against valkey', () => {
  afterAll(async () => {
    await live.flush()
    live.close()
  })

  test('a remembered value is loaded once until it is forgotten', async () => {
    const load = vi.fn(async () => ({ n: 1 }))

    await live.remember('k', MINUTE, load)
    expect(await live.remember('k', MINUTE, load)).toEqual({ n: 1 })
    expect(load).toHaveBeenCalledTimes(1)

    await live.forget('k')
    await live.remember('k', MINUTE, load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('a stored null is a hit, distinct from a miss', async () => {
    await live.write('gone', null, MINUTE)

    expect(await live.read('gone')).toBeNull()
    expect(await live.read('never-written')).toBeUndefined()
  })

  test('ifAbsent never overwrites what is already there', async () => {
    await live.write('tombstone', null, MINUTE)
    await live.write('tombstone', 'late', MINUTE, { ifAbsent: true })

    expect(await live.read('tombstone')).toBeNull()
  })

  test('entries expire', async () => {
    await live.write('brief', 'x', 50)
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(await live.read('brief')).toBeUndefined()
  })

  test('flush removes its own prefix and nothing else', async () => {
    const neighbour = createCache(process.env.REDIS_URL, { prefix: testPrefix() })
    await neighbour.ready(2_000)
    await neighbour.write('keep', 1, MINUTE)
    await live.write('drop', 1, MINUTE)

    expect(await live.flush()).toBeGreaterThanOrEqual(1)
    expect(await live.read('drop')).toBeUndefined()
    expect(await neighbour.read('keep')).toBe(1)

    await neighbour.flush()
    neighbour.close()
  })
})
