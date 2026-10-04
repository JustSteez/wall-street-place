import { hexToRgb, PALETTE } from './palette'

export const AVATAR_SIZE = 32

const PALETTE_RGB = PALETTE.map((p) => hexToRgb(p.hex))

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

/** Nearest palette colour, weighted towards how the eye perceives green. */
export function nearestColor(r: number, g: number, b: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i]
    const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/** Centre-crop an image to a square and reduce it to AVATAR_SIZE² palette indices. */
export function pixelate(img: HTMLImageElement, size = AVATAR_SIZE): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = 'contrast(1.18) saturate(1.35)'
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  const out = new Uint8Array(size * size)
  for (let i = 0; i < out.length; i++) {
    out[i] = nearestColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }
  return out
}

/** Paint palette indices into a canvas at 1px per pixel (scale it up with CSS). */
export function drawIndices(canvas: HTMLCanvasElement, indices: Uint8Array, size = AVATAR_SIZE): void {
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  indices.forEach((c, i) => {
    const [r, g, b] = PALETTE_RGB[c]
    image.data.set([r, g, b, 255], i * 4)
  })
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
