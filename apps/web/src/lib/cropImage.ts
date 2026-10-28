import type { Area } from 'react-easy-crop'

export const ITEM_IMAGE_SIZE = 800
export const ITEM_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Could not load image')))
    image.src = src
  })
}

/** Crops the selected square region and resizes it to exactly 800×800 JPEG. */
export async function cropToItemImage(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = ITEM_IMAGE_SIZE
  canvas.height = ITEM_IMAGE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    ITEM_IMAGE_SIZE,
    ITEM_IMAGE_SIZE,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      0.92,
    )
  })

  return new File([blob], 'item.jpg', { type: 'image/jpeg' })
}
