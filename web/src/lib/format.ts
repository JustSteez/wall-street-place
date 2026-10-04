import { formatUnits } from 'viem'

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** "3d 04:12:09", "04:12:09" or "00:09" style countdown. */
export function countdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft))
  const days = Math.floor(s / 86_400)
  const hours = Math.floor((s % 86_400) / 3_600)
  const minutes = Math.floor((s % 3_600) / 60)
  const seconds = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

/** Token amount (18 decimals) with sensible precision. */
export function formatToken(value: bigint, maxDecimals = 2): string {
  const n = Number(formatUnits(value, 18))
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDecimals })
}

export function formatInt(n: number): string {
  return n.toLocaleString('en-US')
}

export function percent(part: number, whole: number): string {
  if (whole === 0) return '0.0%'
  return `${((part / whole) * 100).toFixed(1)}%`
}

export function timeAgo(secondsAgo: number): string {
  if (secondsAgo < 5) return 'just now'
  if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s ago`
  if (secondsAgo < 3_600) return `${Math.floor(secondsAgo / 60)}m ago`
  return `${Math.floor(secondsAgo / 3_600)}h ago`
}
