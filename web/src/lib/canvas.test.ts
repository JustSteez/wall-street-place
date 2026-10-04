import { describe, expect, test } from 'vitest'
import { decodeCanvas, indexOf, PIXELS, pixelAt, toRgba } from './canvas'
import { hexToRgb, PALETTE, teamColor } from './palette'

function canvasHex(bytes: Record<number, number>): string {
  const arr = new Array(PIXELS).fill('00')
  for (const [i, v] of Object.entries(bytes)) arr[Number(i)] = v.toString(16).padStart(2, '0')
  return `0x${arr.join('')}`
}

describe('decodeCanvas', () => {
  test('decodes team in the high nibble and colour in the low nibble', () => {
    const c = decodeCanvas(canvasHex({ 0: 0x15, [indexOf(99, 99)]: 0x2f }))
    expect(pixelAt(c, 0, 0)).toEqual({ teamId: 1, color: 5 })
    expect(pixelAt(c, 99, 99)).toEqual({ teamId: 2, color: 15 })
    expect(pixelAt(c, 50, 50)).toEqual({ teamId: 0, color: 0 })
  })

  test('tolerates short input and missing 0x prefix', () => {
    const c = decodeCanvas('1a')
    expect(c.length).toBe(PIXELS)
    expect(pixelAt(c, 0, 0)).toEqual({ teamId: 1, color: 10 })
    expect(pixelAt(c, 1, 0)).toEqual({ teamId: 0, color: 0 })
  })

  test('indexOf is row-major', () => {
    expect(indexOf(3, 2)).toBe(203)
  })
})

describe('toRgba', () => {
  test('paint mode uses the palette colour', () => {
    const c = decodeCanvas(canvasHex({ 0: 0x15 }))
    const rgba = toRgba(c, 'paint', new Map())
    expect(Array.from(rgba.slice(0, 4))).toEqual([...hexToRgb(PALETTE[5].hex), 255])
  })

  test('team mode uses the team colour and leaves empty pixels white', () => {
    const c = decodeCanvas(canvasHex({ 0: 0x15 }))
    const rgba = toRgba(c, 'teams', new Map([[1, [1, 2, 3] as [number, number, number]]]))
    expect(Array.from(rgba.slice(0, 4))).toEqual([1, 2, 3, 255])
    expect(Array.from(rgba.slice(4, 8))).toEqual([255, 255, 255, 255])
  })
})

describe('palette', () => {
  test('has exactly 16 colours matching the contract palette', () => {
    expect(PALETTE).toHaveLength(16)
    expect(PALETTE[5].hex).toBe('#E50000')
  })

  test('known tickers get brand colours, unknown ones get a fallback', () => {
    expect(teamColor('NVDA', 1)).toBe('#76B900')
    expect(teamColor('ZZZ', 3)).toMatch(/^#[0-9A-F]{6}$/i)
  })

  test('hexToRgb parses', () => {
    expect(hexToRgb('#0083C7')).toEqual([0, 0x83, 0xc7])
  })
})
