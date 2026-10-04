import type { Team } from '../hooks/useGame'
import { formatInt, percent } from '../lib/format'

interface Props {
  teams: Team[]
  teamPixels: number[]
}

/** Scrolling stock-ticker of territory held by each team. */
export function TickerTape({ teams, teamPixels }: Props) {
  const total = teams.reduce((sum, t) => sum + (teamPixels[t.id] ?? 0), 0)
  const items = teams.map((t) => {
    const px = teamPixels[t.id] ?? 0
    return (
      <span key={t.id} className="tick">
        <span className="tick-dot" style={{ background: t.color }} />
        <strong>{t.ticker}</strong>
        <span>{formatInt(px)} px</span>
        <span className="tick-share">{percent(px, total)}</span>
      </span>
    )
  })
  return (
    <div className="tape" aria-label="Team territory">
      <div className="tape-track">
        {items}
        <span aria-hidden="true" className="tape-dup">{items}</span>
      </div>
    </div>
  )
}
