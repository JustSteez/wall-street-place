import type { GameState, Team } from '../hooks/useGame'
import { PIXELS, SIZE } from './canvas'
import { teamColor } from './palette'

/**
 * Demo mode: used when the site has no contract deployment yet, so visitors can
 * explore the interface. Everything here is simulated and labelled as such in the UI.
 */
const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'AMZN', 'MSFT', 'GOOGL', 'META', 'SPY']
const TEAM_INK = [10, 5, 2, 6, 12, 13, 11, 8]
const ZERO = '0x0000000000000000000000000000000000000000' as const

export const DEMO_TEAMS: Team[] = TICKERS.map((ticker, i) => ({
  id: i + 1,
  token: ZERO,
  ticker,
  minShares: 0n,
  color: teamColor(ticker, i + 1),
}))

/** Deterministic pseudo-random numbers so every visitor sees the same opening scene. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function paint(canvas: Uint8Array, counts: number[], x: number, y: number, teamId: number, color: number) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = y * SIZE + x
  const previous = canvas[i] >> 4
  if (previous) counts[previous]--
  counts[teamId]++
  canvas[i] = (teamId << 4) | color
}

/** A skyline of team towers along the bottom, plus a scatter of skirmish pixels. */
function openingScene(): { canvas: Uint8Array; counts: number[] } {
  const canvas = new Uint8Array(PIXELS)
  const counts = new Array(16).fill(0)
  const rand = rng(46630)
  DEMO_TEAMS.forEach((team, i) => {
    const x0 = 4 + i * 12
    const height = 20 + Math.floor(rand() * 45)
    for (let x = x0; x < x0 + 9; x++) {
      for (let y = 98 - height; y < 98; y++) {
        const window = (x - x0) % 3 === 1 && y % 3 === 0
        paint(canvas, counts, x, y, team.id, window ? 8 : TEAM_INK[i])
      }
    }
  })
  for (let n = 0; n < 380; n++) {
    const team = DEMO_TEAMS[Math.floor(rand() * DEMO_TEAMS.length)]
    paint(canvas, counts, Math.floor(rand() * SIZE), Math.floor(rand() * 55), team.id, TEAM_INK[team.id - 1])
  }
  return { canvas, counts }
}

/** Ends next Friday 20:00 UTC (the 16:00 New York closing bell). */
function nextClosingBell(nowSeconds: number): number {
  const d = new Date(nowSeconds * 1000)
  const daysUntilFriday = (5 - d.getUTCDay() + 7) % 7
  const bell = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilFriday, 20, 0, 0) / 1000
  return bell > nowSeconds ? bell : bell + 7 * 86_400
}

export function demoState(): GameState {
  const { canvas, counts } = openingScene()
  return {
    season: 1,
    seasonEndsAt: nextClosingBell(Date.now() / 1000),
    cooldown: 30,
    skipCooldownCost: 10n * 10n ** 18n,
    protectCost: 25n * 10n ** 18n,
    teams: DEMO_TEAMS,
    canvas,
    teamPixels: counts,
    clockOffset: 0,
  }
}

/** Simulate a few players painting: returns a new state (never mutates the old one). */
export function demoTick(state: GameState): GameState {
  const canvas = new Uint8Array(state.canvas)
  const counts = [...state.teamPixels]
  const strokes = 1 + Math.floor(Math.random() * 3)
  for (let n = 0; n < strokes; n++) {
    const team = DEMO_TEAMS[Math.floor(Math.random() * DEMO_TEAMS.length)]
    const x = Math.floor(Math.random() * SIZE)
    const y = Math.floor(Math.random() * SIZE)
    paint(canvas, counts, x, y, team.id, TEAM_INK[team.id - 1])
  }
  return { ...state, canvas, teamPixels: counts }
}
