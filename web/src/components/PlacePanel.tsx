import { PLACE_MARKET_URL } from '../config/network'
import type { PlaceStatus } from '../hooks/usePlaceStatus'

/** $PLACE's launchpad status: graduation progress while locked, a buy link either way. */
export function PlacePanel({ status }: { status: PlaceStatus }) {
  if (status.progress === null && !PLACE_MARKET_URL) return null
  const pct = Math.round((status.progress ?? 1) * 1000) / 10

  return (
    <section className="panel place-panel" aria-labelledby="place-h">
      <h2 id="place-h">$PLACE</h2>
      {status.locked ? (
        <>
          <p className="place-state">
            🔒 Boost, protect &amp; snapshots unlock when $PLACE <b>graduates</b> on vibe/vibe.
          </p>
          <div className="grad" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="muted small">
            <b>{pct}%</b> of the curve sold. Painting is already live and free.
          </p>
        </>
      ) : (
        <p className="place-state">✓ $PLACE has graduated. Boosts, protection and snapshots are live.</p>
      )}
      {PLACE_MARKET_URL && (
        <a className="btn btn-boost" href={PLACE_MARKET_URL} target="_blank" rel="noreferrer">
          Buy $PLACE on vibe/vibe ↗
        </a>
      )}
    </section>
  )
}
