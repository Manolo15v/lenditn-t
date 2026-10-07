import { cache } from './index.ts'

const removed = await cache.flush()
console.log(
  removed === null
    ? 'cache off or unreachable, nothing to flush'
    : `flushed ${removed} cached keys`,
)
cache.close()
