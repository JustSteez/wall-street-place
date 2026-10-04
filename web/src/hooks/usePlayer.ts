import { useCallback, useEffect, useState } from 'react'
import type { Address } from 'viem'
import { DEPLOYMENT, HAS_FAUCET } from '../config/network'
import { canvasAbi, mockStockAbi, placeFaucetAbi, placeTokenAbi } from '../lib/abi'
import { publicClient } from '../lib/client'
import type { Team } from './useGame'

export interface Holding {
  teamId: number
  shares: bigint
  qualifies: boolean
  faucetReadyAt: number
}

export interface PlayerState {
  nextPlaceAt: number
  placeBalance: bigint
  canvasAllowance: bigint
  snapshotAllowance: bigint
  dripReadyAt: number
  ethBalance: bigint
  holdings: Holding[]
}

const POLL_MS = 6000

async function loadPlayer(account: Address, teams: Team[]): Promise<PlayerState> {
  if (!DEPLOYMENT) throw new Error('No deployment')
  const { canvas, placeToken, snapshot, placeFaucet } = DEPLOYMENT

  const [nextPlaceAt, placeBalance, canvasAllowance, snapshotAllowance, ethBalance, dripReadyAt] = await Promise.all([
    publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'nextPlaceAt', args: [account] }),
    publicClient.readContract({ address: placeToken, abi: placeTokenAbi, functionName: 'balanceOf', args: [account] }),
    publicClient.readContract({ address: placeToken, abi: placeTokenAbi, functionName: 'allowance', args: [account, canvas] }),
    publicClient.readContract({ address: placeToken, abi: placeTokenAbi, functionName: 'allowance', args: [account, snapshot] }),
    publicClient.getBalance({ address: account }),
    HAS_FAUCET
      ? publicClient.readContract({ address: placeFaucet, abi: placeFaucetAbi, functionName: 'nextDripAt', args: [account] })
      : Promise.resolve(0n),
  ])

  const holdings = await Promise.all(
    teams.map(async (team) => {
      const [shares, qualifies, faucetReadyAt] = await Promise.all([
        publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'sharesOf', args: [account, team.id] }),
        publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'isHolder', args: [account, team.id] }),
        HAS_FAUCET
          ? publicClient.readContract({ address: team.token, abi: mockStockAbi, functionName: 'nextFaucetAt', args: [account] })
          : Promise.resolve(0n),
      ])
      return { teamId: team.id, shares, qualifies, faucetReadyAt: Number(faucetReadyAt) }
    }),
  )

  return {
    nextPlaceAt: Number(nextPlaceAt),
    placeBalance,
    canvasAllowance,
    snapshotAllowance,
    dripReadyAt: Number(dripReadyAt),
    ethBalance,
    holdings,
  }
}

export function usePlayer(account: Address | null, teams: Team[] | undefined) {
  const [player, setPlayer] = useState<PlayerState | null>(null)

  const refresh = useCallback(async () => {
    if (!DEPLOYMENT || !account || !teams?.length) {
      setPlayer(null)
      return
    }
    try {
      setPlayer(await loadPlayer(account, teams))
    } catch (e) {
      console.error('Failed to load player', e)
    }
  }, [account, teams])

  useEffect(() => {
    refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  return { player, refresh }
}
