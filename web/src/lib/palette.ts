/** The 16 paint colours, index-aligned with the on-chain low nibble and the BMP palette. */
export const PALETTE = [
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#E4E4E4', name: 'Light grey' },
  { hex: '#888888', name: 'Grey' },
  { hex: '#222222', name: 'Ink' },
  { hex: '#FFA7D1', name: 'Pink' },
  { hex: '#E50000', name: 'Red' },
  { hex: '#E59500', name: 'Orange' },
  { hex: '#A06A42', name: 'Brown' },
  { hex: '#E5D900', name: 'Yellow' },
  { hex: '#94E044', name: 'Lime' },
  { hex: '#02BE01', name: 'Green' },
  { hex: '#00D3DD', name: 'Cyan' },
  { hex: '#0083C7', name: 'Blue' },
  { hex: '#0000EA', name: 'Navy' },
  { hex: '#CF6EE4', name: 'Violet' },
  { hex: '#820080', name: 'Purple' },
] as const

/** Team colours for the "teams" overlay and standings, keyed by ticker. */
const TEAM_COLORS: Record<string, string> = {
  NVDA: '#76B900',
  TSLA: '#E82127',
  AAPL: '#8E8E93',
  AMZN: '#FF9900',
  MSFT: '#00A4EF',
  GOOGL: '#4285F4',
  META: '#0866FF',
  SPY: '#B8860B',
}

const FALLBACK_TEAM_COLORS = ['#7C3AED', '#DB2777', '#0D9488', '#CA8A04', '#4F46E5', '#EA580C', '#16A34A']

export function teamColor(ticker: string, teamId: number): string {
  return TEAM_COLORS[ticker] ?? FALLBACK_TEAM_COLORS[teamId % FALLBACK_TEAM_COLORS.length]
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
