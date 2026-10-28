# `@lendit/web`

React client for Lendit. Students browse the catalogue, sign in, and manage their own listings (including an 800×800 photo). It talks to the API through a typed Hono RPC client; there is no second copy of the item shape.

`src/main.tsx` mounts `App` on `#root`. `src/App.tsx` is only the router.

## Routes (`src/routes/AppRouter.tsx`)

`AuthProvider` wraps every route. `/` waits for `GET /api/auth/me`, then sends the visitor to `/items` or `/login`. Unknown paths go to `/`.

| Path | Page | Guard |
|---|---|---|
| `/login` | Sign in / sign up | Public. Already signed in → `/items` |
| `/items` | Catalogue | Public |
| `/items/:id` | Item detail | Public |
| `/dashboard` | Owner's listings | Session required (`ProtectedRoute` → `/login`) |
| `/product/:id`, `/producto/:id`, `/productp/:id` | Redirect to `/items/:id` | — |

## API client (`src/api.ts`)

`hc<AppType>('/')` so the browser stays same-origin (`/api/...`). `Item` is inferred from `GET /api/items` 200, not hand-written.

`src/context/AuthContext.tsx` is the session: boot with `/me`, `login` / `signup` / `logout` against `/api/auth/*`, and map `email_taken` / `invalid_credentials` to copy. Logout still clears the local user if the request fails.

## Pages

**Login** (`src/pages/login/login.tsx`) — one form, two modes. Signup requires name and password length 8.

**Catalogue** (`src/pages/items/itemSeeker.tsx`) — `GET /api/items`, then `ItemList` (search + category chips).

**Detail** (`src/pages/items/productDetail.tsx`) — `GET /api/items/:id`, related items from the same browse list, photo at `item.imageUrl` or a category icon. The owner can edit or archive from here.

**Dashboard** (`src/pages/items/itemDashboard.tsx`) — `GET /api/items?mine=true`. Modal to create/edit, archive confirm, stats (listed / available / on loan / archived). Create is JSON first, then `syncItemImage`.

## Photos

`ImageField` in the item form accepts JPEG, PNG, WebP, or GIF. Anything that is not already 800×800 JPEG/PNG/WebP opens `react-easy-crop`. `cropToItemImage` (`src/lib/cropImage.ts`) draws a square canvas and emits an 800×800 JPEG.

After save, `syncItemImage` (`src/lib/itemImage.ts`) `POST`s `/api/items/:id/image` or `DELETE`s it if the owner cleared the photo. The API still rejects a file that is not 800×800.

## `src/`

```
main.tsx, App.tsx, index.css
api.ts                 typed client + Item
routes/AppRouter.tsx
context/AuthContext.tsx
pages/login/login.tsx
pages/items/itemSeeker.tsx
pages/items/productDetail.tsx
pages/items/itemDashboard.tsx
components/header/headerData.tsx   brand, Admin, login/logout
components/items/ItemForm.tsx      name, category, price, description, photo
components/items/ImageField.tsx    pick + crop + remove
components/items/itemList.tsx      search/filter grid
components/items/itemInfo.tsx      card → /items/:id
components/ui/Modal.tsx, Toast.tsx, States.tsx
lib/items.ts           category icons, Available/On loan/Archived, price, date
lib/cropImage.ts       800×800 JPEG
lib/itemImage.ts       POST/DELETE photo after save
lib/cn.ts              className merge
```
