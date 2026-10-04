import { useEffect, useRef, useState } from 'react'
import { snort } from '../lib/sound'

/**
 * The mascot: a pixel-art bull whose eyes follow your cursor.
 * Click it and it snorts. Drawn from a character map so it stays crisp at any size.
 */
const MAP = [
  'HH..............HH',
  'HHH............HHH',
  '.HHH..........HHH.',
  '..HHDDDDDDDDDDHH..',
  '..EDBBBBBBBBBBDE..',
  '.EDBBBBBBBBBBBBDE.',
  '.DBBWWBBBBBBWWBBD.',
  '.DBBWWBBBBBBWWBBD.',
  '.DBBBBBBBBBBBBBBD.',
  '..DBBBBBBBBBBBBD..',
  '...DBBNNNNNNBBD...',
  '...DBNNDNNDNNBD...',
  '...DBNNNRRNNNBD...',
  '....DNNNRRNNND....',
  '.....DDDDDDDD.....',
]

const COLORS: Record<string, string> = {
  H: '#FFD23F', // horns
  D: '#0E0E10', // outline
  E: '#2BAA5C', // ears
  B: '#3DDC84', // body — bull market green
  W: '#FFFFFF', // eyes
  N: '#FF9EB5', // nose
  R: '#FFD23F', // nose ring
}

const EYES = [
  { x: 4, y: 6 },
  { x: 12, y: 6 },
]
const WIDTH = MAP[0].length
const HEIGHT = MAP.length

interface Props {
  size?: number
  className?: string
}

export function PixelBull({ size = 320, className = '' }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [look, setLook] = useState({ dx: 0, dy: 0 })
  const [blink, setBlink] = useState(false)
  const [snorting, setSnorting] = useState(0)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height * 0.45
      setLook({ dx: e.clientX > cx ? 1 : 0, dy: e.clientY > cy ? 1 : 0 })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => {
    let timeout = 0
    const loop = () => {
      timeout = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 140)
        loop()
      }, 2400 + Math.random() * 2600)
    }
    loop()
    return () => window.clearTimeout(timeout)
  }, [])

  const onClick = () => {
    snort()
    setSnorting((n) => n + 1)
  }

  const cells: React.ReactNode[] = []
  MAP.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return
      const fill = blink && ch === 'W' ? COLORS.B : COLORS[ch]
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />)
    }),
  )

  return (
    <button
      type="button"
      className={`bull ${snorting ? 'bull-snort' : ''} ${className}`}
      onClick={onClick}
      aria-label="The Wall Street Place bull. Click to make it snort."
      key={snorting}
    >
      <svg
        ref={ref}
        viewBox={`-1 -1 ${WIDTH + 2} ${HEIGHT + 2}`}
        width={size}
        height={(size * (HEIGHT + 2)) / (WIDTH + 2)}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {cells}
        {!blink &&
          EYES.map((e) => <rect key={e.x} x={e.x + look.dx} y={e.y + look.dy} width={1.02} height={1.02} fill={COLORS.D} />)}
        {snorting > 0 && (
          <g className="steam">
            <rect x={6} y={14} width={1} height={1} />
            <rect x={5} y={15} width={1} height={1} />
            <rect x={11} y={14} width={1} height={1} />
            <rect x={12} y={15} width={1} height={1} />
          </g>
        )}
      </svg>
    </button>
  )
}
