import type { Team } from '../hooks/useGame'
import type { PlayerState } from '../hooks/usePlayer'
import { pixelAt } from '../lib/canvas'
import { countdown, formatToken } from '../lib/format'
import { PALETTE } from '../lib/palette'

interface Props {
  connected: boolean
  teams: Team[]
  player: PlayerState | null
  canvas: Uint8Array
  selected: { x: number; y: number } | null
  protectedUntil: number
  teamId: number | null
  color: number
  now: number
  skipCost: bigint
  protectCost: bigint
  busy: string | null
  onTeam: (id: number) => void
  onColor: (c: number) => void
  onPlace: (boosted: boolean) => void
  onProtect: () => void
  onConnect: () => void
}

export function Desk(props: Props) {
  const { connected, teams, player, canvas, selected, teamId, color, now, busy } = props
  const cooldownLeft = player ? player.nextPlaceAt - now : 0
  const ready = cooldownLeft <= 0
  const pixel = selected ? pixelAt(canvas, selected.x, selected.y) : null
  const isProtected = props.protectedUntil > now
  const ownedTeams = teams.filter((t) => player?.holdings.find((h) => h.teamId === t.id)?.qualifies)
  const canAct = connected && selected && teamId !== null && !busy && !isProtected
  const canProtect =
    connected && pixel && pixel.teamId !== 0 && !isProtected && !busy &&
    player?.holdings.find((h) => h.teamId === pixel.teamId)?.qualifies

  return (
    <aside className="panel desk" aria-labelledby="desk-h">
      <h2 id="desk-h">Your desk</h2>

      {!connected ? (
        <div className="desk-empty">
          <p>Connect a wallet holding a stock token to start painting for its team.</p>
          <button className="btn btn-ink" onClick={props.onConnect}>Connect wallet</button>
        </div>
      ) : (
        <>
          <fieldset className="field">
            <legend>Team</legend>
            {ownedTeams.length === 0 ? (
              <p className="muted small">You don't hold any team stock yet{teams.length ? ' — grab some from the faucet below.' : '.'}</p>
            ) : (
              <div className="team-chips">
                {ownedTeams.map((t) => (
                  <button
                    key={t.id}
                    className={`chip ${teamId === t.id ? 'on' : ''}`}
                    style={{ '--team': t.color } as React.CSSProperties}
                    onClick={() => props.onTeam(t.id)}
                    aria-pressed={teamId === t.id}
                  >
                    {t.ticker}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="field">
            <legend>Ink</legend>
            <div className="palette" role="radiogroup" aria-label="Colour">
              {PALETTE.map((p, i) => (
                <button
                  key={p.hex}
                  role="radio"
                  aria-checked={color === i}
                  aria-label={p.name}
                  title={p.name}
                  className={`paint ${color === i ? 'on' : ''}`}
                  style={{ background: p.hex }}
                  onClick={() => props.onColor(i)}
                />
              ))}
            </div>
          </fieldset>

          <div className="order">
            <div className="order-line mono">
              <span>Pixel</span>
              <span>{selected ? `(${selected.x}, ${selected.y})` : '— select on canvas'}</span>
            </div>
            <div className="order-line mono">
              <span>Cooldown</span>
              <span className={ready ? 'up' : ''}>{ready ? 'Ready' : countdown(cooldownLeft)}</span>
            </div>
            {isProtected && (
              <div className="order-line mono alert">
                <span>Protected</span>
                <span>{countdown(props.protectedUntil - now)}</span>
              </div>
            )}
            <button className="btn btn-buy" disabled={!canAct || !ready} onClick={() => props.onPlace(false)}>
              {busy === 'Placing pixel' ? 'Placing…' : 'Place pixel'}
            </button>
            <button className="btn btn-boost" disabled={!canAct} onClick={() => props.onPlace(true)}>
              Boost — skip cooldown <span className="mono">({formatToken(props.skipCost, 0)} $PLACE)</span>
            </button>
            <button className="btn btn-quiet" disabled={!canProtect} onClick={props.onProtect}>
              Protect pixel 1h <span className="mono">({formatToken(props.protectCost, 0)} $PLACE)</span>
            </button>
          </div>

          <dl className="balances mono">
            <div><dt>$PLACE</dt><dd>{player ? formatToken(player.placeBalance) : '…'}</dd></div>
            <div><dt>ETH (gas)</dt><dd>{player ? formatToken(player.ethBalance, 4) : '…'}</dd></div>
          </dl>
          <p className="muted small">
            Selected ink preview shows on the canvas. Boosts, protection and snapshots burn $PLACE — nothing is deposited.
          </p>
        </>
      )}
    </aside>
  )
}
