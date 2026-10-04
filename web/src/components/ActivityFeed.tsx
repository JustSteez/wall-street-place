import type { Team } from '../hooks/useGame'
import type { Trade } from '../hooks/useActivity'
import { shortAddress, timeAgo } from '../lib/format'
import { PALETTE } from '../lib/palette'

interface Props {
  trades: Trade[]
  teams: Team[]
  now: number
  onJump: (x: number, y: number) => void
}

export function ActivityFeed({ trades, teams, now, onJump }: Props) {
  const byId = new Map(teams.map((t) => [t.id, t]))
  return (
    <section className="panel feed" aria-labelledby="feed-h">
      <h2 id="feed-h">The tape</h2>
      {trades.length === 0 ? (
        <p className="muted small">No trades yet this season. Be the opening print.</p>
      ) : (
        <ul>
          {trades.map((t) => {
            const team = byId.get(t.teamId)
            return (
              <li key={t.key}>
                <button className="feed-row" onClick={() => onJump(t.x, t.y)}>
                  <span className="swatch" style={{ background: PALETTE[t.color].hex }} />
                  <span className="mono">{shortAddress(t.painter)}</span>
                  <span>
                    painted <strong style={{ color: team?.color }}>{team?.ticker ?? '?'}</strong> at ({t.x}, {t.y})
                    {t.boosted && <span className="tag">BOOST</span>}
                  </span>
                  <span className="muted mono small">{timeAgo(now - t.seenAt)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
