import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const ITEM_IMAGE_SIZE = 800
export const ITEM_IMAGE_MAX_BYTES = 2 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_FORMAT = new Set(['jpeg', 'png', 'webp'])

// Lives next to the api package so Docker volume mounts and local `tsx` share
// one directory. Filename is always `{itemId}.webp` after re-encode.
const uploadsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../uploads/items',
)

export type ImageValidationError =
  | 'missing'
  | 'too_large'
  | 'unsupported_type'
  | 'invalid_image'
  | 'wrong_dimensions'

export function absoluteImagePath(filename: string) {
  return path.join(uploadsRoot, filename)
}

export async function ensureUploadsDir() {
  await mkdir(uploadsRoot, { recursive: true })
}

export async function validateAndStoreItemImage(
  itemId: string,
  file: File,
): Promise<{ ok: true; filename: string } | { ok: false; error: ImageValidationError }> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'missing' }
  if (file.size > ITEM_IMAGE_MAX_BYTES) return { ok: false, error: 'too_large' }
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: 'unsupported_type' }

  const buffer = Buffer.from(await file.arrayBuffer())

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata()
  } catch {
    return { ok: false, error: 'invalid_image' }
  }

  if (!meta.format || !ALLOWED_FORMAT.has(meta.format)) {
    return { ok: false, error: 'unsupported_type' }
  }
  if (meta.width !== ITEM_IMAGE_SIZE || meta.height !== ITEM_IMAGE_SIZE) {
    return { ok: false, error: 'wrong_dimensions' }
  }

  const filename = `${itemId}.webp`
  await ensureUploadsDir()
  const encoded = await sharp(buffer).webp({ quality: 85 }).toBuffer()
  await writeFile(absoluteImagePath(filename), encoded)
  return { ok: true, filename }
}

export async function removeStoredImage(filename: string | null | undefined) {
  if (!filename) return
  try {
    await unlink(absoluteImagePath(filename))
  } catch {
    // Missing file is fine — the row is the source of truth for "has image".
  }
}

export async function readStoredImage(filename: string) {
  return readFile(absoluteImagePath(filename))
}
