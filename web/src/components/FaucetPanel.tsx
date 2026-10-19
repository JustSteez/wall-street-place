import { GAS_FAUCET_URL, HAS_PLACE_FAUCET } from '../config/network'
import type { Team } from '../hooks/useGame'
import type { PlayerState } from '../hooks/usePlayer'
import { countdown, formatToken } from '../lib/format'

interface Props {
  teams: Team[]
  player: PlayerState | null
  now: number
  busy: string | null
  onStock: (team: Team) => void
  onDrip: () => void
}

/** Testnet-only: free mock stock tokens (and test $PLACE when we run our own) so anyone can join in. */
export function FaucetPanel({ teams, player, now, busy, onStock, onDrip }: Props) {
  if (!player) return null
  const dripLeft = player.dripReadyAt - now
  return (
    <section className="panel faucet" aria-labelledby="faucet-h">
      <h2 id="faucet-h">Testnet desk</h2>
      <p className="muted small">
        Free test stock, 1 share per hour per ticker{HAS_PLACE_FAUCET ? ', and 500 $PLACE every 12h' : ''}. Need gas?
        Grab free test ETH from the{' '}
        {GAS_FAUCET_URL && (
          <a href={GAS_FAUCET_URL} target="_blank" rel="noreferrer">
            vibe/vibe faucet
          </a>
        )}{' '}
        or{' '}
        <a href="https://www.alchemy.com/faucets/robinhood-testnet" target="_blank" rel="noreferrer">
          Alchemy
        </a>
        .
      </p>
      <div className="faucet-grid">
        {teams.map((t) => {
          const h = player.holdings.find((x) => x.teamId === t.id)
          const left = (h?.faucetReadyAt ?? 0) - now
          return (
            <button
              key={t.id}
              className="faucet-btn"
              style={{ '--team': t.color } as React.CSSProperties}
              disabled={left > 0 || Boolean(busy)}
              onClick={() => onStock(t)}
            >
              <strong>{t.ticker}</strong>
              <span className="mono">{left > 0 ? countdown(left) : `hold ${h ? formatToken(h.shares, 2) : '0'}`}</span>
            </button>
          )
        })}
      </div>
      {HAS_PLACE_FAUCET && (
        <button className="btn btn-boost" disabled={dripLeft > 0 || Boolean(busy)} onClick={onDrip}>
          {dripLeft > 0 ? `$PLACE faucet in ${countdown(dripLeft)}` : 'Get 500 $PLACE'}
        </button>
      )}
    </section>
  )
}
