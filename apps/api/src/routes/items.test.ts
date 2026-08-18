import { describe, expect, test } from 'vitest'
import { databaseIsReachable, type ItemBody, json, send, useFixtures } from '../testing.ts'

const { actor, createItem, item, insertLoan } = useFixtures()

const browse = async (query = '', cookie?: string) =>
  (await json<{ items: ItemBody[] }>(await send('GET', `/api/items${query}`, undefined, cookie)))
    .items

const dueTomorrow = () => new Date(Date.now() + 86_400_000)

describe.skipIf(!(await databaseIsReachable()))('item routes', () => {
  test('a listed item is free by default and shows up in browse', async () => {
    const { cookie, user } = await actor()

    const res = await createItem(cookie, { name: 'Lab Coat (M)', category: 'Lab Coats' })
    expect(res.status).toBe(201)

    const { item: listed } = await json<{ item: ItemBody }>(res)
    // Free is the default, not a value the form has to remember to send.
    expect(listed.pricePerDayCents).toBe(0)
    expect(listed.ownerId).toBe(user.id)
    expect(listed.ownerName).toBe('Ana Ruiz')
    expect(listed.isAvailable).toBe(true)
    expect(listed.archivedAt).toBeNull()

    expect((await browse()).map((i) => i.id)).toContain(listed.id)
  })

  test('the owner comes from the session, not the body', async () => {
    const { cookie, user } = await actor()
    const victim = await actor()

    const created = await item(cookie, { ownerId: victim.user.id })
    expect(created.ownerId).toBe(user.id)
  })

  test('an anonymous caller cannot list, edit, or archive', async () => {
    const { cookie } = await actor()
    const created = await item(cookie)

    expect((await createItem('')).status).toBe(401)
    expect((await send('PATCH', `/api/items/${created.id}`, { name: 'Mine now' })).status).toBe(401)
    expect((await send('POST', `/api/items/${created.id}/archive`)).status).toBe(401)

    // Browsing, though, is public — an unauthenticated visitor sees the catalogue.
    expect((await send('GET', '/api/items')).status).toBe(200)
  })

  test('editing someone else’s item is a 403, and a missing one is a 404', async () => {
    const owner = await actor()
    const stranger = await actor()
    const created = await item(owner.cookie)

    const forbidden = await send(
      'PATCH',
      `/api/items/${created.id}`,
      { name: 'Mine' },
      stranger.cookie,
    )
    expect(forbidden.status).toBe(403)
    expect(await json(forbidden)).toEqual({ error: 'not_owner' })

    const archive = await send(
      'POST',
      `/api/items/${created.id}/archive`,
      undefined,
      stranger.cookie,
    )
    expect(archive.status).toBe(403)

    const missing = await send('PATCH', '/api/items/does-not-exist', { name: 'X' }, owner.cookie)
    expect(missing.status).toBe(404)

    // The refusal has to be real, not just a status code.
    expect((await browse()).find((i) => i.id === created.id)?.name).toBe('TI-84 Plus')
  })

  test('the owner can edit their own item', async () => {
    const { cookie } = await actor()
    const created = await item(cookie)

    const res = await send(
      'PATCH',
      `/api/items/${created.id}`,
      { name: '  TI-84 Plus CE  ', category: 'Calculators' },
      cookie,
    )
    expect(res.status).toBe(200)

    const updated = await json<{ item: ItemBody }>(res)
    expect(updated.item.name).toBe('TI-84 Plus CE')
    expect(updated.item.category).toBe('Calculators')
  })

  test('archiving hides the item from browse but not from its owner', async () => {
    const { cookie } = await actor()
    const created = await item(cookie)

    const res = await send('POST', `/api/items/${created.id}/archive`, undefined, cookie)
    expect(res.status).toBe(200)
    const archivedAt = (await json<{ item: ItemBody }>(res)).item.archivedAt
    expect(archivedAt).not.toBeNull()

    expect((await browse()).map((i) => i.id)).not.toContain(created.id)
    expect((await browse('?mine=true', cookie)).map((i) => i.id)).toContain(created.id)

    // Archiving is not deletion, and a second call must not rewrite the stamp.
    const again = await send('POST', `/api/items/${created.id}/archive`, undefined, cookie)
    expect((await json<{ item: ItemBody }>(again)).item.archivedAt).toBe(archivedAt)

    // An archived item is frozen: editing it is a 409, not a silent success.
    const edit = await send('PATCH', `/api/items/${created.id}`, { name: 'Back' }, cookie)
    expect(edit.status).toBe(409)
  })

  test('availability is derived from active loans, not stored', async () => {
    const owner = await actor()
    const borrower = await actor()
    const created = await item(owner.cookie)

    expect((await browse()).find((i) => i.id === created.id)?.isAvailable).toBe(true)

    await insertLoan({
      itemId: created.id,
      borrowerId: borrower.user.id,
      status: 'active',
      pricePerDayCents: created.pricePerDayCents,
      dueAt: dueTomorrow(),
    })

    // Nothing on the item row changed. The flag flips because it is a query.
    expect((await browse()).find((i) => i.id === created.id)?.isAvailable).toBe(false)
  })

  test('a pending request does not make the item unavailable', async () => {
    const owner = await actor()
    const borrower = await actor()
    const created = await item(owner.cookie)

    await insertLoan({
      itemId: created.id,
      borrowerId: borrower.user.id,
      status: 'requested',
      pricePerDayCents: 0,
      dueAt: dueTomorrow(),
    })

    // Rule 5: requesting is not reserving. Approval is what allocates the item.
    expect((await browse()).find((i) => i.id === created.id)?.isAvailable).toBe(true)
  })

  test('the server rejects what the form should not have sent', async () => {
    const { cookie } = await actor()

    // A category outside the shared list, so the browse filter cannot fragment.
    expect((await createItem(cookie, { category: 'Bananas' })).status).toBe(400)
    expect((await createItem(cookie, { name: '   ' })).status).toBe(400)
    // int4 permits a negative, so only this check turns it into a 400 instead of
    // letting the check constraint raise a 500.
    expect((await createItem(cookie, { pricePerDayCents: -1 })).status).toBe(400)
    expect((await createItem(cookie, { pricePerDayCents: 1.5 })).status).toBe(400)

    const created = await item(cookie)
    // An empty patch is a no-op dressed up as a saved edit.
    expect((await send('PATCH', `/api/items/${created.id}`, {}, cookie)).status).toBe(400)
  })
})
