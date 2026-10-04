import { describe, expect, test } from 'vitest'
import { countdown, formatInt, formatToken, percent, shortAddress, timeAgo } from './format'

describe('format', () => {
  test('countdown picks the right shape', () => {
    expect(countdown(9)).toBe('00:09')
    expect(countdown(3_725)).toBe('01:02:05')
    expect(countdown(2 * 86_400 + 61)).toBe('2d 00:01:01')
    expect(countdown(-5)).toBe('00:00')
  })

  test('formatToken handles 18 decimals', () => {
    expect(formatToken(1_500_000_000_000_000_000n)).toBe('1.5')
    expect(formatToken(10n ** 21n, 0)).toBe('1,000')
  })

  test('percent guards division by zero', () => {
    expect(percent(0, 0)).toBe('0.0%')
    expect(percent(1, 4)).toBe('25.0%')
  })

  test('misc helpers', () => {
    expect(formatInt(10_000)).toBe('10,000')
    expect(shortAddress('0xde1D5C39f6a06236F897A05dD3c25c1aC1433a8D')).toBe('0xde1D…3a8D')
    expect(timeAgo(2)).toBe('just now')
    expect(timeAgo(42)).toBe('42s ago')
    expect(timeAgo(125)).toBe('2m ago')
    expect(timeAgo(7_300)).toBe('2h ago')
  })
})
