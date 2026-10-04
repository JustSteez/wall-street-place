import { PixelBull } from './PixelBull'

/** The trading floor before the contracts go live. */
export function FloorSoon() {
  return (
    <div className="floor-soon">
      <PixelBull size={150} />
      <h3>The floor opens at launch</h3>
      <p>
        10,000 blank pixels are waiting. Grab your trader card now, pick your team, and be ready when the opening bell
        rings on Robinhood Chain.
      </p>
      <a className="pill pill-lime pill-lg" href="#card">Get your trader card →</a>
    </div>
  )
}
