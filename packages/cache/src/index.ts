import { once } from 'node:events'
import Valkey from 'iovalkey'

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

type Options = {
  prefix?: string
  onError?: (error: Error) => void
}

export function createCache(url: string | undefined, options: Options = {}) {
  const prefix = options.prefix ?? 'lendit:'
  const client = url
    ? new Valkey(url, { enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 200 })
    : null

  let reported = false
  client?.on('ready', () => {
    reported = false
  })
  client?.on('error', (error: Error & { code?: string }) => {
    if (options.onError) return options.onError(error)
    if (reported) return
    reported = true
    console.warn(`cache unreachable, serving from postgres: ${error.code ?? error.message}`)
  })

  const key = (name: string) => prefix + name

  async function read<T extends Json>(name: string): Promise<T | undefined> {
    if (!client) return undefined
    try {
      const raw = await client.get(key(name))
      return raw === null ? undefined : (JSON.parse(raw) as T)
    } catch {
      return undefined
    }
  }

  async function write(name: string, value: Json, ttlMs: number, { ifAbsent = false } = {}) {
    const px = Math.floor(ttlMs)
    if (!client || px < 1) return
    const json = JSON.stringify(value)
    try {
      if (ifAbsent) await client.set(key(name), json, 'PX', px, 'NX')
      else await client.set(key(name), json, 'PX', px)
    } catch {}
  }

  async function forget(...names: string[]) {
    if (!client || names.length === 0) return
    try {
      await client.unlink(...names.map(key))
    } catch {}
  }

  async function remember<T extends Json>(name: string, ttlMs: number, load: () => Promise<T>) {
    const hit = await read<T>(name)
    if (hit !== undefined) return hit
    const value = await load()
    if (value !== null) await write(name, value, ttlMs, { ifAbsent: true })
    return value
  }

  async function ready(timeoutMs: number) {
    if (!client) return false
    if (client.status === 'ready') return true
    try {
      await once(client, 'ready', { signal: AbortSignal.timeout(timeoutMs) })
      return true
    } catch {
      return false
    }
  }

  async function status() {
    if (!client) return 'off' as const
    try {
      await client.ping()
      return 'ok' as const
    } catch {
      return 'down' as const
    }
  }

  async function flush() {
    if (!client || !(await ready(2_000))) return null
    let removed = 0
    for await (const names of client.scanStream({ match: `${prefix}*`, count: 500 })) {
      if (names.length) removed += await client.unlink(...(names as string[]))
    }
    return removed
  }

  const close = () => client?.disconnect()

  return { read, write, forget, remember, ready, status, flush, close }
}

export const cache = createCache(process.env.REDIS_URL)
