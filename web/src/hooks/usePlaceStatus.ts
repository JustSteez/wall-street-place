import { useEffect, useState } from 'react'
import { DEPLOYMENT } from '../config/network'
import { launchCurveAbi, launchTokenAbi } from '../lib/abi'
import { publicClient } from '../lib/client'

export interface PlaceStatus {
  /** True while $PLACE transfers are locked by its launchpad curve (boost/protect/mint can't pay). */
  locked: boolean
  /** Share of the curve's inventory sold, 0..1 (null if $PLACE has no curve). */
  progress: number | null
}

const POLL_MS = 15_000
const UNLOCKED: PlaceStatus = { locked: false, progress: null }

async function loadStatus(): Promise<PlaceStatus> {
  if (!DEPLOYMENT) return UNLOCKED
  let curve: `0x${string}`
  try {
    curve = await publicClient.readContract({
      address: DEPLOYMENT.placeToken,
      abi: launchTokenAbi,
      functionName: 'curve',
    })
  } catch {
    return UNLOCKED // a plain ERC-20: nothing to wait for
  }
  const [complete, sold, remaining] = await Promise.all([
    publicClient.readContract({ address: curve, abi: launchCurveAbi, functionName: 'complete' }),
    publicClient.readContract({ address: curve, abi: launchCurveAbi, functionName: 'sold' }),
    publicClient.readContract({ address: curve, abi: launchCurveAbi, functionName: 'remainingInventory' }),
  ])
  const total = sold + remaining
  const progress = total === 0n ? 1 : Number((sold * 10_000n) / total) / 10_000
  return { locked: !complete, progress: complete ? 1 : progress }
}

/** Tracks whether $PLACE can be spent yet, and how close its launchpad curve is to graduating. */
export function usePlaceStatus(): PlaceStatus {
  const [status, setStatus] = useState<PlaceStatus>(UNLOCKED)
  useEffect(() => {
    if (!DEPLOYMENT) return
    let cancelled = false
    const poll = () =>
      loadStatus()
        .then((s) => !cancelled && setStatus(s))
        .catch((error) => console.error('Failed to read $PLACE status', error))
    poll()
    const id = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])
  return status
}
