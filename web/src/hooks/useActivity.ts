import { useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { DEPLOYMENT } from '../config/network'
import { canvasAbi } from '../lib/abi'
import { publicClient } from '../lib/client'

export interface Trade {
  key: string
  x: number
  y: number
  color: number
  teamId: number
  painter: Address
  boosted: boolean
  blockNumber: bigint
  seenAt: number
}

const LOOKBACK_BLOCKS = 20_000n
const MAX_RANGE = 10_000n
const MAX_ITEMS = 40
const POLL_MS = 5000

const pixelPlaced = canvasAbi.find((item) => item.type === 'event' && item.name === 'PixelPlaced')!

/** Recent PixelPlaced events, newest first, fetched incrementally. */
export function useActivity(season: number | undefined) {
  const [trades, setTrades] = useState<Trade[]>([])
  const cursor = useRef<bigint | null>(null)

  useEffect(() => {
    if (!DEPLOYMENT || !season) return
    const canvas = DEPLOYMENT.canvas
    let cancelled = false
    cursor.current = null
    setTrades([])

    async function poll() {
      try {
        const latest = await publicClient.getBlockNumber()
        let from = cursor.current ?? (latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n)
        const fresh: Trade[] = []
        while (from <= latest && !cancelled) {
          const to = from + MAX_RANGE - 1n < latest ? from + MAX_RANGE - 1n : latest
          const logs = await publicClient.getLogs({
            address: canvas,
            event: pixelPlaced,
            args: { season: BigInt(season!) },
            fromBlock: from,
            toBlock: to,
          })
          for (const log of logs) {
            fresh.push({
              key: `${log.transactionHash}-${log.logIndex}`,
              x: Number(log.args.x),
              y: Number(log.args.y),
              color: Number(log.args.color),
              teamId: Number(log.args.teamId),
              painter: log.args.painter!,
              boosted: Boolean(log.args.boosted),
              blockNumber: log.blockNumber,
              seenAt: Date.now() / 1000,
            })
          }
          from = to + 1n
        }
        cursor.current = latest + 1n
        if (!cancelled && fresh.length) {
          setTrades((prev) => {
            const seen = new Set(prev.map((t) => t.key))
            const merged = [...fresh.filter((t) => !seen.has(t.key)).reverse(), ...prev]
            return merged.slice(0, MAX_ITEMS)
          })
        }
      } catch (e) {
        console.error('Failed to load activity', e)
      }
    }

    poll()
    const id = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [season])

  return trades
}
