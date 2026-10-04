import { useRef } from 'react'
import { IS_PRELAUNCH } from '../config/network'
import type { Team } from '../hooks/useGame'
import type { PlayerState } from '../hooks/usePlayer'
import { formatInt, formatToken, percent } from '../lib/format'

interface Props {
  teams: Team[]
  teamPixels: number[]
  player: PlayerState | null
  selectedTeam: number | null
  onPick: (teamId: number) => void
}

function TiltCard({
  children,
  color,
  active,
  onClick,
}: {
  children: React.ReactNode
  color: string
  active: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - py) * 16}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 18}deg`)
    el.style.setProperty('--gx', `${px * 100}%`)
    el.style.setProperty('--gy', `${py * 100}%`)
  }
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <button
      ref={ref}
      className={`tcard ${active ? 'tcard-on' : ''}`}
      style={{ '--team': color } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

export function TeamCards({ teams, teamPixels, player, selectedTeam, onPick }: Props) {
  const total = teams.reduce((s, t) => s + (teamPixels[t.id] ?? 0), 0)
  const ranked = [...teams].sort((a, b) => (teamPixels[b.id] ?? 0) - (teamPixels[a.id] ?? 0) || a.id - b.id)
  const rank = new Map(ranked.map((t, i) => [t.id, i + 1]))

  return (
    <section className="teams" id="teams" aria-labelledby="teams-h">
      <div className="section-head">
        <p className="eyebrow">The roster</p>
        <h2 id="teams-h">Pick your side</h2>
        <p className="section-sub">Every stock is a team. Hold any amount of its token to paint in its name.</p>
      </div>
      <div className="tcard-grid">
        {teams.map((t) => {
          const px = teamPixels[t.id] ?? 0
          const holding = player?.holdings.find((h) => h.teamId === t.id)
          return (
            <TiltCard key={t.id} color={t.color} active={selectedTeam === t.id} onClick={() => onPick(t.id)}>
              {!IS_PRELAUNCH && <span className="tcard-rank">#{rank.get(t.id)}</span>}
              <span className="tcard-ticker">{t.ticker}</span>
              <span className="tcard-pixels">
                {IS_PRELAUNCH ? (
                  <small>Opens at launch</small>
                ) : (
                  <>
                    {formatInt(px)} <small>px · {percent(px, total)}</small>
                  </>
                )}
              </span>
              <span className="tcard-foot">
                {holding?.qualifies ? (
                  <b>✓ You hold {formatToken(holding.shares, 2)}</b>
                ) : (
                  <span>
                    {IS_PRELAUNCH ? 'Hold it to paint for it' : holding ? 'Not held yet' : 'Connect to check'}
                  </span>
                )}
              </span>
              <span className="tcard-glare" aria-hidden="true" />
            </TiltCard>
          )
        })}
      </div>
    </section>
  )
}
