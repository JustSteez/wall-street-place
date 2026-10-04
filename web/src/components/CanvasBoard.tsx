import { useEffect, useMemo, useRef, useState } from 'react'
import type { Team } from '../hooks/useGame'
import { pixelAt, SIZE, toRgba } from '../lib/canvas'
import { hexToRgb, PALETTE } from '../lib/palette'

interface Props {
  canvas: Uint8Array
  teams: Team[]
  selected: { x: number; y: number } | null
  previewColor: number | null
  onSelect: (x: number, y: number) => void
}

const ZOOMS = [4, 6, 8, 12, 16, 24]

export function CanvasBoard({ canvas, teams, selected, previewColor, onSelect }: Props) {
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
            style={{ width: SIZE * zoom, height: SIZE * zoom }}
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
        </div>
      </div>
      <p className="hint">Drag to pan · Ctrl + scroll to zoom · Click to select</p>
    </section>
  )
}
