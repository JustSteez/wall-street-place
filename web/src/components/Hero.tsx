import { IS_PRELAUNCH } from '../config/network'
import type { Team } from '../hooks/useGame'
import { useScrollY } from '../hooks/useInView'
import { countdown, formatInt } from '../lib/format'
import { PixelBull } from './PixelBull'
import { Ribbons } from './Ribbons'

interface Props {
  season: number | undefined
  secondsLeft: number | undefined
  teams: Team[]
  teamPixels: number[]
}

export function Hero({ season, secondsLeft, teams, teamPixels }: Props) {
  const y = useScrollY()
  const claimed = teams.reduce((sum, t) => sum + (teamPixels[t.id] ?? 0), 0)

  return (
    <header className="hero" id="top">
      <div
        className="hero-photo"
        style={{
          backgroundImage: 'url(./img/nyse-wide.webp)',
          transform: `translate3d(0, ${Math.min(y, 1200) * 0.35}px, 0) scale(1.08)`,
        }}
      />
      <div className="hero-shade" />

      <div className="hero-inner">
        <p className="hero-kicker">
          <span className="live-dot" />{' '}
          {IS_PRELAUNCH ? 'Launching soon on Robinhood Chain' : `Season ${season ?? '–'} is live on Robinhood Chain`}
        </p>
        <h1 className="hero-title" style={{ transform: `translate3d(0, ${y * -0.12}px, 0)` }}>
          <span className="ht-line ht-paint">Paint</span>
          <span className="ht-small">the</span>
          <span className="ht-line ht-street">Street</span>
        </h1>
        <PixelBull size={260} className="hero-bull" />
        <p className="hero-sub">
          A 10,000-pixel canvas where every stock is a team. <strong>Hold NVDA, paint for NVDA.</strong> Your shares never
          leave your wallet.
        </p>
        <div className="hero-ctas">
          {IS_PRELAUNCH ? (
            <a href="#card" className="pill pill-lime pill-lg">Get your trader card →</a>
          ) : (
            <a href="#floor" className="pill pill-lime pill-lg">Start painting →</a>
          )}
          <a href="#how" className="pill pill-ghost pill-lg">How it works</a>
        </div>
        <dl className="hero-stats">
          <div>
            <dt>{IS_PRELAUNCH ? 'Status' : 'Closing bell'}</dt>
            <dd>{IS_PRELAUNCH ? 'Launching soon' : secondsLeft === undefined ? '—' : countdown(secondsLeft)}</dd>
          </div>
          <div>
            <dt>{IS_PRELAUNCH ? 'Canvas' : 'Pixels claimed'}</dt>
            <dd>{IS_PRELAUNCH ? '10,000 px' : formatInt(claimed)}</dd>
          </div>
          <div>
            <dt>Teams</dt>
            <dd>{teams.length || '—'}</dd>
          </div>
        </dl>
      </div>

      <Ribbons teams={teams} teamPixels={teamPixels} />
    </header>
  )
}
