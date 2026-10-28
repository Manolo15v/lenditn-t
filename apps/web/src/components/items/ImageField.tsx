import { ImagePlus, Loader2, Trash2, ZoomIn } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { cropToItemImage, ITEM_IMAGE_ACCEPT, ITEM_IMAGE_SIZE } from '../../lib/cropImage'

export interface ImageFieldValue {
  file: File | null
  /** True when the user cleared an existing photo and did not pick a replacement. */
  cleared: boolean
}

interface ImageFieldProps {
  existingUrl?: string | null
  value: ImageFieldValue
  onChange: (value: ImageFieldValue) => void
  disabled?: boolean
}

export function ImageField({
  existingUrl = null,
  value,
  onChange,
  disabled = false,
}: ImageFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [cropping, setCropping] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!value.file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value.file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value.file])

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const shown = previewUrl ?? (value.cleared ? null : existingUrl)

  function clearPicker() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setCropping(false)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return

    if (!ITEM_IMAGE_ACCEPT.split(',').includes(file.type)) {
      setError('Use JPEG, PNG, WebP, or GIF.')
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      // Exact 800×800 JPEG/PNG/WebP can skip the cropper. GIF (and anything else)
      // still goes through crop so the upload is always a format the API accepts.
      const skipCrop =
        image.width === ITEM_IMAGE_SIZE &&
        image.height === ITEM_IMAGE_SIZE &&
        (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')
      if (skipCrop) {
        URL.revokeObjectURL(url)
        onChange({ file, cleared: false })
        return
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setSourceUrl(url)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropping(true)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      setError('That file could not be read as an image.')
    }
    image.src = url
  }

  async function applyCrop() {
    if (!sourceUrl || !croppedArea) return
    setBusy(true)
    setError(null)
    try {
      const file = await cropToItemImage(sourceUrl, croppedArea)
      onChange({ file, cleared: false })
      clearPicker()
    } catch {
      setError('Could not crop the image. Try another file.')
    } finally {
      setBusy(false)
    }
  }

  function removeImage() {
    onChange({ file: null, cleared: Boolean(existingUrl) })
    clearPicker()
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label">Photo</span>
      <p className="text-[11px] text-ink-faint">
        JPEG, PNG, WebP, or GIF. Saved at {ITEM_IMAGE_SIZE}×{ITEM_IMAGE_SIZE}. Larger images can be
        cropped.
      </p>

      {cropping && sourceUrl ? (
        <div className="overflow-hidden rounded-xl border border-line bg-canvas">
          <div className="relative h-64 w-full">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCroppedArea(area)}
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-line p-3">
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <ZoomIn className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
                disabled={busy}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={clearPicker} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={() => void applyCrop()}
                disabled={busy || !croppedArea}
                aria-busy={busy}
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy ? 'Cropping' : `Crop to ${ITEM_IMAGE_SIZE}×${ITEM_IMAGE_SIZE}`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div
            className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl
              border border-line bg-canvas"
          >
            {shown ? (
              <img src={shown} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-ink-faint" aria-hidden="true" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ITEM_IMAGE_ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <label
              htmlFor={inputId}
              className={`btn-outline w-fit cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {shown ? 'Replace photo' : 'Choose photo'}
            </label>
            {shown && (
              <button
                type="button"
                className="btn-ghost w-fit text-red-600"
                onClick={removeImage}
                disabled={disabled}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
