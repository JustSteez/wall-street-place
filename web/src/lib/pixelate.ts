export const AVATAR_SIZE = 32

/** Valid X handle: 1–15 letters, digits or underscores (leading @ allowed). */
export function normalizeHandle(input: string): string | null {
  const handle = input.trim().replace(/^@/, '')
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null
}

/** Public X profile picture via unavatar (CORS-enabled, no login). */
export function avatarUrl(handle: string): string {
  return `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

/** Centre-crop an image to a square and shrink it to AVATAR_SIZE² pixels, keeping its real colours. */
export function pixelate(img: HTMLImageElement, size = AVATAR_SIZE): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size).data
}

/** Paint RGBA pixels into a canvas at 1px per pixel (scale it up with CSS or drawImage). */
export function drawPixels(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, size = AVATAR_SIZE): void {
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  image.data.set(pixels)
  ctx.putImageData(image, 0, 0)
}

/** Stable 1–9999 card number for a handle (FNV-1a). */
export function cardNumber(handle: string): number {
  let h = 0x811c9dc5
  for (const ch of handle.toLowerCase()) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h % 9999) + 1
}

const ROLES = ['Floor Trader', 'Market Maker', 'Diamond Hands', 'Bull Runner', 'Opening Bell', 'Pixel Whale', 'Night Desk', 'Closing Bell']

/** A fun, stable desk title for a handle. */
export function cardRole(handle: string): string {
  return ROLES[cardNumber(handle) % ROLES.length]
}
