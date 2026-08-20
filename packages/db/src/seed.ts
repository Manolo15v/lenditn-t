import { hash } from '@node-rs/argon2'
import { db, items, loans, pg, users } from './index.ts'

// Manual Tilt resource — the "reset data" button. Truncates, then re-inserts a
// known fixture set covering every loan status so the UI has something to show
// for browse, "my items", and "my loans" without a human clicking through the
// app first.
await pg`truncate loans, sessions, items, users restart identity cascade`

const passwordHash = await hash('123456', { memoryCost: 19456, timeCost: 2, parallelism: 1 })

// .returning() types its result as an array — this repo's convention (see
// constraints.test.ts) is to fail loudly rather than assume the row landed.
function row<T>(rows: T[], index: number): T {
  const found = rows[index]
  if (!found) throw new Error(`seed: expected row at index ${index}`)
  return found
}

const insertedUsers = await db
  .insert(users)
  .values([
    { name: 'Samuel', email: 'samuelrojas@ujap.com', passwordHash },
    { name: 'Jonathan', email: 'jonathan@ujap.com', passwordHash },
    { name: 'Ana', email: 'ana@ujap.com', passwordHash },
    { name: 'Maria', email: 'maria@ujap.com', passwordHash },
    { name: 'Leonardo', email: 'leonardo@ujap.com', passwordHash },
  ])
  .returning({ id: users.id })

const samuel = row(insertedUsers, 0)
const jonathan = row(insertedUsers, 1)
const ana = row(insertedUsers, 2)
const maria = row(insertedUsers, 3)
const leonardo = row(insertedUsers, 4)

const day = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * day)
const daysFromNow = (n: number) => new Date(Date.now() + n * day)

const insertedItems = await db
  .insert(items)
  .values([
    {
      ownerId: samuel.id,
      name: 'TI-84 Plus Calculator',
      description: 'Graphing calculator, barely used.',
      category: 'Calculators',
      pricePerDayCents: 50,
    },
    {
      ownerId: samuel.id,
      name: 'Lab Coat (M)',
      description: 'Standard white lab coat, size medium.',
      category: 'Lab Coats',
      pricePerDayCents: 0,
    },
    {
      ownerId: jonathan.id,
      name: 'Drafting Kit',
      description: 'Compass, rulers, and set squares.',
      category: 'Drafting Kits',
      pricePerDayCents: 100,
    },
    {
      ownerId: jonathan.id,
      name: 'Soldering Iron 60W',
      description: 'Adjustable temperature, comes with stand.',
      category: 'Soldering Irons',
      pricePerDayCents: 75,
    },
    {
      ownerId: ana.id,
      name: 'Casio FX-991 Calculator',
      description: null,
      category: 'Calculators',
      pricePerDayCents: 0,
    },
    {
      ownerId: ana.id,
      name: 'USB Microscope',
      description: 'Digital microscope, 1000x zoom.',
      category: 'Other',
      pricePerDayCents: 150,
    },
    {
      ownerId: maria.id,
      name: 'Safety Goggles',
      description: 'Chemical splash rated.',
      category: 'Lab Coats',
      pricePerDayCents: 0,
    },
    {
      ownerId: maria.id,
      name: 'Breadboard + Jumper Wires',
      description: 'Full kit for basic circuits.',
      category: 'Other',
      pricePerDayCents: 0,
      archivedAt: new Date(),
    },
    {
      ownerId: leonardo.id,
      name: 'Digital Multimeter',
      description: 'Auto-ranging, with probes.',
      category: 'Other',
      pricePerDayCents: 60,
    },
  ])
  .returning({ id: items.id, pricePerDayCents: items.pricePerDayCents })

const calculator = row(insertedItems, 0)
const draftingKit = row(insertedItems, 2)
const solderingIron = row(insertedItems, 3)
const graphingCalc = row(insertedItems, 4)
const microscope = row(insertedItems, 5)
const safetyGoggles = row(insertedItems, 6)

await db.insert(loans).values([
  // active: currently out on loan — blocks a second active loan on this item.
  {
    itemId: calculator.id,
    borrowerId: ana.id,
    status: 'active',
    pricePerDayCents: calculator.pricePerDayCents,
    requestedAt: daysAgo(3),
    dueAt: daysFromNow(4),
    startedAt: daysAgo(2),
  },
  // requested: awaiting the owner's decision.
  {
    itemId: draftingKit.id,
    borrowerId: leonardo.id,
    status: 'requested',
    pricePerDayCents: draftingKit.pricePerDayCents,
    requestedAt: daysAgo(1),
    dueAt: daysFromNow(6),
  },
  // returned: back from the borrower, not yet settled.
  {
    itemId: solderingIron.id,
    borrowerId: samuel.id,
    status: 'returned',
    pricePerDayCents: solderingIron.pricePerDayCents,
    requestedAt: daysAgo(10),
    dueAt: daysAgo(3),
    startedAt: daysAgo(9),
    returnedAt: daysAgo(4),
    totalCents: solderingIron.pricePerDayCents * 5,
  },
  // settled: fully closed out, payment reconciled.
  {
    itemId: microscope.id,
    borrowerId: jonathan.id,
    status: 'settled',
    pricePerDayCents: microscope.pricePerDayCents,
    requestedAt: daysAgo(20),
    dueAt: daysAgo(13),
    startedAt: daysAgo(19),
    returnedAt: daysAgo(14),
    totalCents: microscope.pricePerDayCents * 5,
    settledAt: daysAgo(13),
  },
  // declined: owner said no.
  {
    itemId: graphingCalc.id,
    borrowerId: maria.id,
    status: 'declined',
    pricePerDayCents: graphingCalc.pricePerDayCents,
    requestedAt: daysAgo(2),
    dueAt: daysFromNow(5),
    note: 'Needed for an exam that week.',
  },
  // cancelled: borrower withdrew the request.
  {
    itemId: safetyGoggles.id,
    borrowerId: leonardo.id,
    status: 'cancelled',
    pricePerDayCents: safetyGoggles.pricePerDayCents,
    requestedAt: daysAgo(5),
    dueAt: daysAgo(1),
  },
])

console.log('database reset; fixtures loaded (5 users, 9 items, 6 loans)')
console.log('test users (password: 123456): anyone on the team @ujap.com,')

await pg.end()
