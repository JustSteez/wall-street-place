import { useEffect, useMemo, useState } from 'react'
import { DEPLOYMENT } from '../config/network'
import type { Team } from '../hooks/useGame'
import { canvasAbi } from '../lib/abi'
import { decodeCanvas, SIZE, toRgba } from '../lib/canvas'
import { publicClient } from '../lib/client'
import { formatToken } from '../lib/format'
import { hexToRgb } from '../lib/palette'

interface Props {
  season: number
  seasonEnded: boolean
  teams: Team[]
  mintCost: bigint
  busy: string | null
  connected: boolean
  onMint: (season: number) => void
  onRoll: () => void
}

interface PastSeason {
  season: number
  winner: number
  image: string
}

function renderThumb(canvas: Uint8Array, teams: Team[]): string {
  const el = document.createElement('canvas')
  el.width = SIZE
  el.height = SIZE
  const teamRgb = new Map(teams.map((t) => [t.id, hexToRgb(t.color)]))
  el.getContext('2d')!.putImageData(new ImageData(toRgba(canvas, 'paint', teamRgb) as ImageDataArray, SIZE, SIZE), 0, 0)
  return el.toDataURL('image/png')
}

export function Gallery({ season, seasonEnded, teams, mintCost, busy, connected, onMint, onRoll }: Props) {
  const [past, setPast] = useState<PastSeason[]>([])
  const byId = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  useEffect(() => {
    if (!DEPLOYMENT || season <= 1) return
    let cancelled = false
    const canvas = DEPLOYMENT.canvas
    const seasons = Array.from({ length: Math.min(season - 1, 6) }, (_, i) => season - 1 - i)
    Promise.all(
      seasons.map(async (s) => {
        const [hex, winner] = await Promise.all([
          publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'getCanvas', args: [BigInt(s)] }),
          publicClient.readContract({ address: canvas, abi: canvasAbi, functionName: 'seasonWinner', args: [BigInt(s)] }),
        ])
        return { season: s, winner: Number(winner), image: renderThumb(decodeCanvas(hex), teams) }
      }),
    )
      .then((rows) => !cancelled && setPast(rows))
      .catch((e) => console.error('Failed to load past seasons', e))
    return () => {
      cancelled = true
    }
  }, [season, teams])

  return (
    <section className="panel gallery" aria-labelledby="gallery-h">
      <h2 id="gallery-h">Season archive</h2>
      {seasonEnded && (
        <div className="bell-rung">
          <p>The closing bell has rung on season {season}.</p>
          <button className="btn btn-ink" disabled={Boolean(busy)} onClick={onRoll}>Ring in season {season + 1}</button>
        </div>
      )}
      {past.length === 0 ? (
        <p className="muted small">
          Finished seasons are frozen forever on-chain. Mint any finished canvas as a fully on-chain collectible for{' '}
          {formatToken(mintCost, 0)} $PLACE (burned).
        </p>
      ) : (
        <div className="gallery-grid">
          {past.map((p) => (
            <figure key={p.season}>
              <img src={p.image} alt={`Season ${p.season} final canvas`} width={SIZE} height={SIZE} />
              <figcaption>
                <span>Season {p.season}</span>
                <span className="muted">Winner: {byId.get(p.winner)?.ticker ?? '—'}</span>
                <button className="btn btn-quiet" disabled={!connected || Boolean(busy)} onClick={() => onMint(p.season)}>
                  Mint · {formatToken(mintCost, 0)} $PLACE
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}
