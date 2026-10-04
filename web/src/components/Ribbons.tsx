import { IS_PRELAUNCH } from '../config/network'
import type { Team } from '../hooks/useGame'
import { formatInt } from '../lib/format'

interface Props {
  teams: Team[]
  teamPixels: number[]
}

/** Two slanted marquee ribbons: live territory on one, the rules on the other. */
export function Ribbons({ teams, teamPixels }: Props) {
  const ticks = teams.map((t) => (
    <span key={t.id} className="rib-item">
      <i style={{ background: t.color }} />
      {t.ticker} {IS_PRELAUNCH ? 'TEAM' : `${formatInt(teamPixels[t.id] ?? 0)} PX`}
    </span>
  ))
  const slogans = ['HOLD THE STOCK', 'PAINT THE PIXEL', 'TAKE THE STREET', 'RING THE BELL'].map((s) => (
    <span key={s} className="rib-item">
      {s} <b aria-hidden="true">✦</b>
    </span>
  ))

  return (
    <div className="ribbons" aria-hidden="true">
      <div className="ribbon ribbon-a">
        <div className="rib-track">
          {ticks}
          {ticks}
          {ticks}
        </div>
      </div>
      <div className="ribbon ribbon-b">
        <div className="rib-track rib-reverse">
          {slogans}
          {slogans}
          {slogans}
        </div>
      </div>
    </div>
  )
}
