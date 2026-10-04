import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { DEPLOYMENT } from '../config/network'
import { canvasAbi } from '../lib/abi'
import { decodeCanvas } from '../lib/canvas'
import { publicClient } from '../lib/client'
import { teamColor } from '../lib/palette'

export interface Team {
  id: number
  token: Address
  ticker: string
  minShares: bigint
  color: string
}

export interface GameState {
  season: number
  seasonEndsAt: number
  cooldown: number
  skipCooldownCost: bigint
  protectCost: bigint
  teams: Team[]
  canvas: Uint8Array
  teamPixels: number[]
  /** Chain time minus device time, in seconds — corrects for skewed device clocks. */
  clockOffset: number
}

const POLL_MS = 4000

async function loadTeams(canvas: Address): Promise<Team[]> {
  const count = Number(await publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'teamCount' }))
  const ids = Array.from({ length: count }, (_, i) => i + 1)
  const raw = await Promise.all(
    ids.map((id) => publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'getTeam', args: [id] })),
  )
  return raw.map(([token, minShares, ticker], i) => ({
    id: ids[i],
    token,
    ticker,
    minShares,
    color: teamColor(ticker, ids[i]),
  }))
}

async function loadSnapshot(canvas: Address, teams: Team[]): Promise<GameState> {
  const read = <T,>(functionName: string, args: readonly unknown[] = []) =>
    publicClient.readContract({ address: canvas, abi: canvasAbi, functionName, args } as never) as Promise<T>

  const [season, endsAt, cooldown, skipCost, protectCost] = await Promise.all([
    read<bigint>('currentSeason'),
    read<bigint>('seasonEndsAt'),
    read<bigint>('cooldown'),
    read<bigint>('skipCooldownCost'),
    read<bigint>('protectCost'),
  ])
  const [canvasHex, counts, block] = await Promise.all([
    read<`0x${string}`>('getCanvas', [season]),
    read<readonly number[]>('teamPixels', [season]),
    publicClient.getBlock(),
  ])
  return {
    season: Number(season),
    seasonEndsAt: Number(endsAt),
    cooldown: Number(cooldown),
    skipCooldownCost: skipCost,
    protectCost,
    teams,
    canvas: decodeCanvas(canvasHex),
    teamPixels: counts.map(Number),
    clockOffset: Number(block.timestamp) - Date.now() / 1000,
  }
}

export function useGame() {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const teamsRef = useRef<Team[] | null>(null)

  const refresh = useCallback(async () => {
    if (!DEPLOYMENT) return
    try {
      teamsRef.current ??= await loadTeams(DEPLOYMENT.canvas)
      setState(await loadSnapshot(DEPLOYMENT.canvas, teamsRef.current))
      setError(null)
    } catch (e) {
      console.error('Failed to load canvas', e)
      setError('Could not reach Robinhood Chain. Retrying…')
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  return { state, error, refresh }
}
