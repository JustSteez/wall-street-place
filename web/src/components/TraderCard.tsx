import { useEffect, useRef, useState } from 'react'
import type { Team } from '../hooks/useGame'
import type { PlayerState } from '../hooks/usePlayer'
import { renderCardPng } from '../lib/cardCanvas'
import {
  AVATAR_SIZE,
  avatarUrl,
  cardNumber,
  cardRole,
  drawIndices,
  loadImage,
  normalizeHandle,
  pixelate,
} from '../lib/pixelate'
import { pop } from '../lib/sound'
import { PixelBull } from './PixelBull'

interface Props {
  teams: Team[]
  player: PlayerState | null
  defaultTeam: number | null
}

type Status = { kind: 'idle' | 'loading' | 'ready' | 'error'; message?: string }

const SEASON_LABEL = 'Season 1'

export function TraderCard({ teams, player, defaultTeam }: Props) {
  const [input, setInput] = useState('')
  const [handle, setHandle] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<Uint8Array | null>(null)
  const [teamId, setTeamId] = useState<number>(defaultTeam ?? 1)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)
  const avatarRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultTeam) setTeamId(defaultTeam)
  }, [defaultTeam])

  useEffect(() => {
    if (avatar && avatarRef.current) drawIndices(avatarRef.current, avatar)
  }, [avatar])

  const team = teams.find((t) => t.id === teamId) ?? teams[0]
  const holds = Boolean(player?.holdings.find((h) => h.teamId === team?.id)?.qualifies)
  const shownHandle = handle ?? 'yourhandle'
  const number = handle ? cardNumber(handle) : 0
  const role = handle ? cardRole(handle) : 'Future Floor Trader'

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = normalizeHandle(input)
    if (!clean) {
      setStatus({ kind: 'error', message: 'Enter a valid X handle (letters, numbers, underscores).' })
      return
    }
    setStatus({ kind: 'loading', message: `Pulling @${clean} from X…` })
    setHandle(clean)
    try {
      const img = await loadImage(avatarUrl(clean))
      setAvatar(pixelate(img))
      setStatus({ kind: 'ready' })
      pop(8)
    } catch {
      setAvatar(null)
      setStatus({ kind: 'ready', message: `Couldn't load @${clean}'s picture, so the bull is standing in.` })
    }
  }

  const cardData = () => ({
    handle: shownHandle,
    number,
    role,
    team: team?.ticker ?? '—',
    teamColor: team?.color ?? '#3DDC84',
    status: holds ? 'Holder ✓' : 'Rookie',
    season: SEASON_LABEL,
    avatar,
  })

  const download = async () => {
    try {
      const blob = await renderCardPng(cardData())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wall-street-place-${shownHandle}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Card download failed', error)
      setStatus({ kind: 'error', message: 'Could not create the image. Try again.' })
    }
  }

  const copy = async () => {
    try {
      const blob = await renderCardPng(cardData())
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Card copy failed', error)
      setStatus({ kind: 'error', message: 'Your browser blocked copying. Use Download instead.' })
    }
  }

  const shareUrl = () => {
    const site = `${window.location.origin}${window.location.pathname}`
    const text = `Just pulled my Wall Street Place trader card 🐂\n\nTeam $${team?.ticker} · ${role} · #${String(number).padStart(4, '0')}\n\nPaint the street on Robinhood Chain 👇`
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(site)}`
  }

  const onMove = (e: React.PointerEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - py) * 18}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 22}deg`)
    el.style.setProperty('--gx', `${px * 100}%`)
    el.style.setProperty('--gy', `${py * 100}%`)
  }
  const onLeave = () => {
    cardRef.current?.style.setProperty('--rx', '0deg')
    cardRef.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <section className="cardlab" id="card" aria-labelledby="card-h">
      <div className="cardlab-copy">
        <p className="eyebrow">Your trader card</p>
        <h2 id="card-h">Get on the floor</h2>
        <p className="section-sub">
          Drop your X handle. We pull your profile picture, repaint it in the 16 colours of the canvas, and print your
          trader card. Download it, post it, flex it.
        </p>

        <form className="cardlab-form" onSubmit={generate}>
          <label htmlFor="x-handle" className="sr-only">
            X handle
          </label>
          <span className="at" aria-hidden="true">
            @
          </span>
          <input
            id="x-handle"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="your X handle"
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
          />
          <button className="pill pill-lime" disabled={status.kind === 'loading'}>
            {status.kind === 'loading' ? 'Printing…' : handle ? 'Reprint' : 'Print my card'}
          </button>
        </form>
        {status.message && (
          <p className={`cardlab-status ${status.kind === 'error' ? 'is-error' : ''}`} role="status">
            {status.message}
          </p>
        )}

        <fieldset className="field">
          <legend>Team</legend>
          <div className="team-chips">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip ${team?.id === t.id ? 'on' : ''}`}
                style={{ '--team': t.color } as React.CSSProperties}
                onClick={() => setTeamId(t.id)}
                aria-pressed={team?.id === t.id}
              >
                {t.ticker}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="cardlab-actions">
          <button className="pill pill-dark" onClick={download} disabled={!handle}>
            Download PNG
          </button>
          <button className="pill pill-outline" onClick={copy} disabled={!handle}>
            {copied ? 'Copied!' : 'Copy image'}
          </button>
          <a
            className={`pill pill-outline ${handle ? '' : 'is-disabled'}`}
            href={handle ? shareUrl() : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!handle}
          >
            Share on 𝕏
          </a>
        </div>
        {handle && <p className="muted small">Tip: download the card, then attach it to your post.</p>}
      </div>

      <div className="cardlab-stage">
        <div
          ref={cardRef}
          className={`tc ${handle ? 'tc-live' : 'tc-empty'}`}
          style={{ '--team': team?.color ?? '#3DDC84' } as React.CSSProperties}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <div className="tc-inner">
            <header className="tc-top">
              <span>Wall Street Place · Trader card</span>
              <span>#{handle ? String(number).padStart(4, '0') : '????'}</span>
            </header>
            <div className="tc-photo">
              {avatar ? (
                <canvas
                  ref={avatarRef}
                  width={AVATAR_SIZE}
                  height={AVATAR_SIZE}
                  aria-label={`Pixel portrait of @${shownHandle}`}
                />
              ) : (
                <PixelBull size={170} />
              )}
              <span className="tc-badge">{team?.ticker}</span>
            </div>
            <div className="tc-name">@{shownHandle}</div>
            <div className="tc-role">
              {role} · {SEASON_LABEL}
            </div>
            <dl className="tc-stats">
              <div>
                <dt>Team</dt>
                <dd>{team?.ticker}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{holds ? 'Holder ✓' : 'Rookie'}</dd>
              </div>
              <div>
                <dt>Card</dt>
                <dd>#{handle ? String(number).padStart(4, '0') : '????'}</dd>
              </div>
            </dl>
            <footer className="tc-tape" aria-hidden="true">
              <span>TAKE THE STREET ✦ PAINT THE PIXEL ✦ ROBINHOOD CHAIN ✦ TAKE THE STREET ✦</span>
            </footer>
          </div>
          <span className="tc-shine" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
