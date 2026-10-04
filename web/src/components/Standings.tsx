import type { Team } from '../hooks/useGame'
import { formatInt, percent } from '../lib/format'

interface Props {
  teams: Team[]
  teamPixels: number[]
}

export function Standings({ teams, teamPixels }: Props) {
  const ranked = [...teams].sort((a, b) => (teamPixels[b.id] ?? 0) - (teamPixels[a.id] ?? 0) || a.id - b.id)
  const total = ranked.reduce((sum, t) => sum + (teamPixels[t.id] ?? 0), 0)
  const max = Math.max(1, ...ranked.map((t) => teamPixels[t.id] ?? 0))

  return (
    <section className="panel standings" aria-labelledby="standings-h">
      <h2 id="standings-h">Standings</h2>
      <ol>
        {ranked.map((t, i) => {
          const px = teamPixels[t.id] ?? 0
          return (
            <li key={t.id} className={i === 0 && px > 0 ? 'leader' : ''}>
              <span className="rank mono">{i + 1}</span>
              <span className="ticker">{t.ticker}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${(px / max) * 100}%`, background: t.color }} />
              </span>
              <span className="mono num">{formatInt(px)}</span>
              <span className="mono num muted">{percent(px, total)}</span>
            </li>
          )
        })}
      </ol>
      <p className="muted small">{formatInt(total)} of 10,000 pixels claimed. Most territory at the closing bell wins the season.</p>
    </section>
  )
}
