import type { Team } from '../hooks/useGame'
import type { PlayerState } from '../hooks/usePlayer'
import { pixelAt } from '../lib/canvas'
import { useState } from 'react'
import { countdown, formatToken } from '../lib/format'
import { buzz } from '../lib/sound'
import { PALETTE } from '../lib/palette'
import { GAS_FAUCET_URL, HAS_STOCK_FAUCET } from '../config/network'
import { HAS_PRIVY } from '../lib/wallets'

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
  /** $PLACE can't be spent yet (launchpad curve hasn't graduated). */
  placeLocked: boolean
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
  const [shake, setShake] = useState(0)
  const onPlaceClick = () => {
    if (!ready) {
      buzz()
      setShake((n) => n + 1)
      return
    }
    props.onPlace(false)
  }
  const canProtect =
    connected &&
    pixel &&
    pixel.teamId !== 0 &&
    !isProtected &&
    !busy &&
    player?.holdings.find((h) => h.teamId === pixel.teamId)?.qualifies

  return (
    <aside className="panel desk" aria-labelledby="desk-h">
      <h2 id="desk-h">Your desk</h2>

      {!connected ? (
        <div className="desk-empty">
          <p className="eyebrow">Viewing as guest</p>
          {pixel && selected && (
            <p className="mono small">
              ({selected.x}, {selected.y}) ·{' '}
              {pixel.teamId === 0 ? 'blank' : `held by ${teams.find((t) => t.id === pixel.teamId)?.ticker ?? 'unknown'}`}
            </p>
          )}
          <p>
            Browse the canvas, standings and trades freely. To paint, {HAS_PRIVY ? 'log in or connect' : 'connect'} a
            wallet holding a team's stock token{HAS_STOCK_FAUCET ? ' — the testnet desk hands out free test stock' : ''}.
          </p>
          <button className="btn btn-ink" onClick={props.onConnect}>
            {HAS_PRIVY ? 'Log in to paint' : 'Connect wallet'}
          </button>
        </div>
      ) : (
        <>
          <fieldset className="field">
            <legend>Team</legend>
            {ownedTeams.length === 0 ? (
              <p className="muted small">
                You don't hold any team stock yet{teams.length ? ' — grab some from the faucet below.' : '.'}
              </p>
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
            <div key={shake} className={`order-line mono ${shake ? 'shake' : ''}`}>
              <span>Cooldown</span>
              <span className={ready ? 'up' : ''}>{ready ? 'Ready' : countdown(cooldownLeft)}</span>
            </div>
            {isProtected && (
              <div className="order-line mono alert">
                <span>Protected</span>
                <span>{countdown(props.protectedUntil - now)}</span>
              </div>
            )}
            <button className="btn btn-buy" disabled={!canAct} onClick={onPlaceClick}>
              {busy === 'Placing pixel'
                ? 'Placing…'
                : ready
                  ? 'Place pixel'
                  : `Cooling down · ${countdown(cooldownLeft)}`}
            </button>
            <button
              className="btn btn-boost"
              disabled={!canAct || props.placeLocked}
              onClick={() => props.onPlace(true)}
            >
              {props.placeLocked ? '🔒 ' : ''}Boost — skip cooldown{' '}
              <span className="mono">({formatToken(props.skipCost, 0)} $PLACE)</span>
            </button>
            <button className="btn btn-quiet" disabled={!canProtect || props.placeLocked} onClick={props.onProtect}>
              {props.placeLocked ? '🔒 ' : ''}Protect pixel 1h{' '}
              <span className="mono">({formatToken(props.protectCost, 0)} $PLACE)</span>
            </button>
            {props.placeLocked && (
              <p className="muted small lock-note">Boost and protect unlock when $PLACE graduates on vibe/vibe.</p>
            )}
          </div>

          <dl className="balances mono">
            <div>
              <dt>$PLACE</dt>
              <dd>{player ? formatToken(player.placeBalance) : '…'}</dd>
            </div>
            <div>
              <dt>ETH (gas)</dt>
              <dd>{player ? formatToken(player.ethBalance, 4) : '…'}</dd>
            </div>
          </dl>
          {GAS_FAUCET_URL && player && player.ethBalance === 0n && (
            <p className="desk-gas small">
              You need a little testnet ETH for gas before you can paint. Get some free from the{' '}
              <a href={GAS_FAUCET_URL} target="_blank" rel="noreferrer">testnet faucet</a> (paste your address from the
              wallet menu).
            </p>
          )}
          <p className="muted small">
            Selected ink preview shows on the canvas. Boosts, protection and snapshots burn $PLACE — nothing is
            deposited.
          </p>
        </>
      )}
    </aside>
  )
}
