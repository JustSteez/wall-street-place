import { useEffect, useMemo, useRef, useState } from 'react'
import type { Team } from '../hooks/useGame'
import { pixelAt, SIZE, toRgba } from '../lib/canvas'
import { hexToRgb, PALETTE } from '../lib/palette'

export interface Burst {
  id: number
  x: number
  y: number
  color: number
}

interface Props {
  canvas: Uint8Array
  teams: Team[]
  selected: { x: number; y: number } | null
  previewColor: number | null
  burst: Burst | null
  onSelect: (x: number, y: number) => void
}

/** A paintbrush cursor tinted with the chosen ink. */
function brushCursor(hex: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M20 3l9 9-11 11-9-9z' fill='%230E0E10'/><path d='M8 15l9 9-3 3c-2 2-6 3-10 2 1-4 0-8 2-10z' fill='${hex.replace('#', '%23')}' stroke='%230E0E10' stroke-width='2'/></svg>`
  return `url("data:image/svg+xml;utf8,${svg}") 3 29, crosshair`
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 26 + (i % 3) * 14
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4 + (i % 3) * 2 }
})

const ZOOMS = [4, 6, 8, 12, 16, 24]

export function CanvasBoard({ canvas, teams, selected, previewColor, burst, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  const [zoomIndex, setZoomIndex] = useState(1)
  const [mode, setMode] = useState<'paint' | 'teams'>('paint')
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const zoom = ZOOMS[zoomIndex]

  const teamRgb = useMemo(() => new Map(teams.map((t) => [t.id, hexToRgb(t.color)])), [teams])
  const tickerOf = useMemo(() => new Map(teams.map((t) => [t.id, t.ticker])), [teams])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.putImageData(new ImageData(toRgba(canvas, mode, teamRgb) as ImageDataArray, SIZE, SIZE), 0, 0)
  }, [canvas, mode, teamRgb])

  const toCell = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * SIZE)
    const y = Math.floor(((clientY - rect.top) / rect.height) * SIZE)
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE ? { x, y } : null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const vp = viewportRef.current!
    drag.current = { x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    setHover(toCell(e.clientX, e.clientY))
    const d = drag.current
    if (!d || e.buttons !== 1) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    if (d.moved) {
      viewportRef.current!.scrollLeft = d.left - dx
      viewportRef.current!.scrollTop = d.top - dy
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (d?.moved) return
    const cell = toCell(e.clientX, e.clientY)
    if (cell) onSelect(cell.x, cell.y)
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setZoomIndex((i) => Math.min(ZOOMS.length - 1, Math.max(0, i + (e.deltaY < 0 ? 1 : -1))))
  }

  const info = hover ?? selected
  const infoPixel = info ? pixelAt(canvas, info.x, info.y) : null

  return (
    <section className="board" aria-label="Canvas">
      <div className="board-toolbar">
        <div className="segmented" role="group" aria-label="View">
          <button className={mode === 'paint' ? 'on' : ''} onClick={() => setMode('paint')}>Paint</button>
          <button className={mode === 'teams' ? 'on' : ''} onClick={() => setMode('teams')}>Territory</button>
        </div>
        <div className="coords mono" aria-live="polite">
          {info && infoPixel ? (
            <>
              <span>({info.x}, {info.y})</span>
              <span className="swatch" style={{ background: PALETTE[infoPixel.color].hex }} />
              <span>{infoPixel.teamId ? tickerOf.get(infoPixel.teamId) : 'unclaimed'}</span>
            </>
          ) : (
            <span>Click a pixel</span>
          )}
        </div>
        <div className="zoom" role="group" aria-label="Zoom">
          <button onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} aria-label="Zoom out">−</button>
          <span className="mono">{zoom}×</span>
          <button onClick={() => setZoomIndex((i) => Math.min(ZOOMS.length - 1, i + 1))} aria-label="Zoom in">+</button>
        </div>
      </div>

      <div className="board-viewport" ref={viewportRef} onWheel={onWheel}>
        <div className="board-stage" style={{ width: SIZE * zoom, height: SIZE * zoom }}>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="board-canvas"
            style={{
              width: SIZE * zoom,
              height: SIZE * zoom,
              cursor: previewColor === null ? 'crosshair' : brushCursor(PALETTE[previewColor].hex),
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHover(null)}
          />
          {hover && (
            <div className="cursor-cell" style={{ left: hover.x * zoom, top: hover.y * zoom, width: zoom, height: zoom }} />
          )}
          {selected && (
            <div
              className="selected-cell"
              style={{
                left: selected.x * zoom,
                top: selected.y * zoom,
                width: zoom,
                height: zoom,
                background: previewColor === null ? undefined : PALETTE[previewColor].hex,
              }}
            />
          )}
          {burst && (
            <div
              key={burst.id}
              className="burst"
              style={{ left: (burst.x + 0.5) * zoom, top: (burst.y + 0.5) * zoom }}
              aria-hidden="true"
            >
              {PARTICLES.map((p, i) => (
                <i
                  key={i}
                  style={
                    {
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      width: p.size,
                      height: p.size,
                      background: i % 4 === 0 ? '#FFD23F' : PALETTE[burst.color].hex,
                    } as React.CSSProperties
                  }
                />
              ))}
              <b>+1</b>
            </div>
          )}
        </div>
      </div>
      <p className="hint">Drag to pan · Ctrl + scroll to zoom · Click to select</p>
    </section>
  )
}
