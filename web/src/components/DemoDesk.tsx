import { PixelBull } from './PixelBull'

/** Shown in place of the order desk while the site runs in demo mode. */
export function DemoDesk() {
  return (
    <aside className="panel demo-desk" aria-labelledby="demo-desk-h">
      <PixelBull size={120} />
      <h2 id="demo-desk-h">Your desk</h2>
      <p>When the contracts go live you'll paint from here:</p>
      <ol>
        <li>Connect a wallet holding a stock token</li>
        <li>Pick your team and an ink colour</li>
        <li>Click a pixel and place your order</li>
      </ol>
      <a className="btn btn-quiet" href="https://github.com/JustSteez/wall-street-place" target="_blank" rel="noreferrer">
        Follow the build on GitHub
      </a>
    </aside>
  )
}
