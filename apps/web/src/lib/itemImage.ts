import { api } from '../api'
import type { ImageFieldValue } from '../components/items/ImageField'

const imageMessages: Record<string, string> = {
  missing: 'Choose an image to upload.',
  too_large: 'That image is too large (max 2 MB).',
  unsupported_type: 'Use JPEG, PNG, or WebP.',
  invalid_image: 'That file is not a valid image.',
  wrong_dimensions: 'Images must be exactly 800×800. Crop it in the form first.',
  not_owner: 'That item belongs to someone else.',
  not_found: 'That item no longer exists.',
  archived: 'That item is archived, so it cannot be edited.',
  unauthenticated: 'Your session expired. Sign in again.',
}

async function imageErrorFrom(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return imageMessages[body.error ?? ''] ?? 'Could not save the photo. Please try again.'
}

/** After create/patch, sync the photo: upload a new file, or delete if cleared. */
export async function syncItemImage(
  itemId: string,
  image: ImageFieldValue,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (image.file) {
    const res = await api.api.items[':id'].image.$post({
      param: { id: itemId },
      form: { image: image.file },
    })
    if (!res.ok) return { ok: false, error: await imageErrorFrom(res) }
    return { ok: true }
  }

  if (image.cleared) {
    const res = await api.api.items[':id'].image.$delete({ param: { id: itemId } })
    if (!res.ok) return { ok: false, error: await imageErrorFrom(res) }
  }

  return { ok: true }
}
