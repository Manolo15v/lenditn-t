import { hash } from '@node-rs/argon2'
import { createId } from '@paralleldrive/cuid2'
import { pg } from './index.ts'

// Manual Tilt resource — the "reset data" button. Truncates, then re-inserts a
// known fixture set. Content lands with M3/M4.
await pg`truncate loans, sessions, items, users restart identity cascade`

const passwordHash = await hash('123456', { memoryCost: 19456, timeCost: 2, parallelism: 1 })
await pg`
	insert into users (id, name, email, password_hash)
	values (${createId()}, 'Samuel', 'samuelrojas@ujap.com', ${passwordHash})
`

console.log('database reset; test user created: samuelrojas@ujap.com')

await pg.end()
