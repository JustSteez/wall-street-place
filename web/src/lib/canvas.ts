import { hexToRgb, PALETTE } from './palette'

export const SIZE = 100
export const PIXELS = SIZE * SIZE

export interface Pixel {
  teamId: number
  color: number
}

/** Decode the contract's canvas bytes ("0x…" hex, one byte per pixel, (team << 4) | color). */
export function decodeCanvas(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(PIXELS)
  const count = Math.min(PIXELS, clean.length / 2)
  for (let i = 0; i < count; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function pixelAt(canvas: Uint8Array, x: number, y: number): Pixel {
  const value = canvas[y * SIZE + x] ?? 0
  return { teamId: value >> 4, color: value & 0x0f }
}

export function indexOf(x: number, y: number): number {
  return y * SIZE + x
}

const PALETTE_RGB = PALETTE.map((p) => hexToRgb(p.hex))

/**
 * Paint a decoded canvas into RGBA pixel data.
 * In team mode, owned pixels take their team colour and empty pixels stay paper-white.
 */
export function toRgba(
  canvas: Uint8Array,
  mode: 'paint' | 'teams',
  teamRgb: Map<number, [number, number, number]>,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(PIXELS * 4)
  for (let i = 0; i < PIXELS; i++) {
    const value = canvas[i]
    const teamId = value >> 4
    let rgb: [number, number, number]
    if (mode === 'teams') {
      rgb = teamId === 0 ? [255, 255, 255] : (teamRgb.get(teamId) ?? [200, 200, 200])
    } else {
      rgb = PALETTE_RGB[value & 0x0f]
    }
    rgba[i * 4] = rgb[0]
    rgba[i * 4 + 1] = rgb[1]
    rgba[i * 4 + 2] = rgb[2]
    rgba[i * 4 + 3] = 255
  }
  return rgba
}
