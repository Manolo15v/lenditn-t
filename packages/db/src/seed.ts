import { pg } from './index.ts'

// Manual Tilt resource — the "reset data" button. Truncates, then re-inserts a
// known fixture set. Content lands with M3/M4.
await pg`truncate loans, sessions, items, users restart identity cascade`
console.log('database reset (no fixtures yet)')

await pg.end()
