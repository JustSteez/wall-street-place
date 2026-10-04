import type { ReactNode } from 'react'
import { useInView } from '../hooks/useInView'
import { countdown } from '../lib/format'
import { PALETTE } from '../lib/palette'

interface ChapterProps {
  photo?: string
  tone?: 'dark' | 'lime' | 'purple'
  eyebrow: string
  children: ReactNode
  aside?: ReactNode
}

function Chapter({ photo, tone = 'dark', eyebrow, children, aside }: ChapterProps) {
  const { ref, inView } = useInView<HTMLElement>(0.4)
  return (
    <section ref={ref} className={`chapter chapter-${tone} ${inView ? 'is-in' : ''}`}>
      {photo && <div className="chapter-photo" style={{ backgroundImage: `url(${photo})` }} />}
      <div className="chapter-inner">
        <p className="chapter-eyebrow">{eyebrow}</p>
        <h2 className="chapter-line">{children}</h2>
        {aside && <div className="chapter-aside">{aside}</div>}
      </div>
    </section>
  )
}

/** Three-step paint demo: pixels pop in one after another. */
function PaintDemo() {
  const colors = [10, 10, 5, 10, 3, 5, 10, 5, 5]
  return (
    <div className="paint-demo" aria-hidden="true">
      {colors.map((c, i) => (
        <span key={i} style={{ background: PALETTE[c].hex, transitionDelay: `${300 + i * 120}ms` }} />
      ))}
    </div>
  )
}

export function Story({ secondsLeft }: { secondsLeft: number | undefined }) {
  return (
    <div className="story" id="how">
      <Chapter photo="./img/wall-st-sign.webp" eyebrow="09:30 · Opening bell">
        It's your first day on Wall Street, <em>trader.</em>
      </Chapter>
      <Chapter tone="lime" eyebrow="Rule #1" aside={<PaintDemo />}>
        Your shares are your <em>paint.</em>
        <small>Hold a stock token in your wallet and you can paint for its team. We only read your balance. Nothing is deposited.</small>
      </Chapter>
      <Chapter photo="./img/nyse-flag.webp" eyebrow="Rule #2">
        Pick a side. <em>Take territory.</em>
        <small>One pixel every 30 seconds. Burn $PLACE to boost past the cooldown or lock a pixel for an hour.</small>
      </Chapter>
      <Chapter
        photo="./img/nyse-tower.webp"
        tone="purple"
        eyebrow="16:00 · Closing bell"
        aside={
          <div className="bell-clock">
            <span>Bell rings in</span>
            <strong>{secondsLeft === undefined ? '—' : countdown(secondsLeft)}</strong>
          </div>
        }
      >
        Most pixels at the bell <em>wins the week.</em>
        <small>The final canvas freezes on-chain forever. Mint it as fully on-chain art.</small>
      </Chapter>
    </div>
  )
}
