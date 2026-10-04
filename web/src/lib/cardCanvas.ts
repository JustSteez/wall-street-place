import { AVATAR_SIZE, drawPixels } from './pixelate'
import { hexToRgb } from './palette'

export interface CardData {
  handle: string
  number: number
  role: string
  team: string
  teamColor: string
  status: string
  season: string
  avatar: Uint8ClampedArray | null
}

const W = 1080
const H = 1350
const INK = '#0E0E10'
const LIME = '#D4FF3A'

/** The bull mascot as a fallback avatar (matches PixelBull's map). */
const BULL = [
  'HH..............HH', 'HHH............HHH', '.HHH..........HHH.', '..HHDDDDDDDDDDHH..',
  '..EDBBBBBBBBBBDE..', '.EDBBBBBBBBBBBBDE.', '.DBBWWBBBBBBWWBBD.', '.DBBWDBBBBBBWDBBD.',
  '.DBBBBBBBBBBBBBBD.', '..DBBBBBBBBBBBBD..', '...DBBNNNNNNBBD...', '...DBNNDNNDNNBD...',
  '...DBNNNRRNNNBD...', '....DNNNRRNNND....', '.....DDDDDDDD.....',
]
const BULL_COLORS: Record<string, string> = {
  H: '#FFD23F', D: INK, E: '#2BAA5C', B: '#3DDC84', W: '#FFFFFF', N: '#FF9EB5', R: '#FFD23F',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawAvatar(ctx: CanvasRenderingContext2D, data: CardData, x: number, y: number, size: number) {
  ctx.fillStyle = data.teamColor
  ctx.fillRect(x, y, size, size)
  if (data.avatar) {
    // Draw at 1px per pixel, then scale up with smoothing off: no seams between cells.
    const small = document.createElement('canvas')
    small.width = AVATAR_SIZE
    small.height = AVATAR_SIZE
    drawPixels(small, data.avatar)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, x, y, size, size)
    return
  }
  const cell = Math.floor((size * 0.7) / BULL[0].length)
  const ox = x + (size - cell * BULL[0].length) / 2
  const oy = y + (size - cell * BULL.length) / 2
  BULL.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch === '.') return
      ctx.fillStyle = BULL_COLORS[ch]
      ctx.fillRect(ox + rx * cell, oy + ry * cell, cell, cell)
    }),
  )
}

function stat(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, w: number) {
  roundRect(ctx, x, y, w, 132, 22)
  ctx.fillStyle = '#1B1B20'
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '600 26px "Space Grotesk"'
  ctx.fillText(label.toUpperCase(), x + 26, y + 46)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '400 54px Anton'
  ctx.fillText(value, x + 26, y + 108, w - 52)
}

/** Render the trader card to a 1080×1350 PNG blob (the 4:5 size X and Instagram like). */
export async function renderCardPng(data: CardData): Promise<Blob> {
  await Promise.all([document.fonts.load('400 80px Anton'), document.fonts.load('700 30px "Space Grotesk"')])
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // Foil border: team colour into lime.
  const [r, g, b] = hexToRgb(data.teamColor)
  const foil = ctx.createLinearGradient(0, 0, W, H)
  foil.addColorStop(0, data.teamColor)
  foil.addColorStop(0.5, LIME)
  foil.addColorStop(1, `rgb(${r},${g},${b})`)
  roundRect(ctx, 0, 0, W, H, 64)
  ctx.fillStyle = foil
  ctx.fill()
  roundRect(ctx, 28, 28, W - 56, H - 56, 44)
  ctx.fillStyle = INK
  ctx.fill()

  // Header
  ctx.fillStyle = LIME
  ctx.font = '700 30px "Space Grotesk"'
  ctx.fillText('WALL STREET PLACE · TRADER CARD', 80, 110)
  ctx.textAlign = 'right'
  ctx.fillText(`#${String(data.number).padStart(4, '0')}`, W - 80, 110)
  ctx.textAlign = 'left'

  // Avatar
  const avatarSize = 600
  const ax = (W - avatarSize) / 2
  const ay = 150
  roundRect(ctx, ax - 10, ay - 10, avatarSize + 20, avatarSize + 20, 28)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.save()
  roundRect(ctx, ax, ay, avatarSize, avatarSize, 20)
  ctx.clip()
  drawAvatar(ctx, data, ax, ay, avatarSize)
  ctx.restore()

  // Team badge
  ctx.font = '400 56px Anton'
  const badgeW = ctx.measureText(data.team).width + 56
  roundRect(ctx, ax + avatarSize - badgeW + 24, ay + avatarSize - 60, badgeW, 92, 20)
  ctx.fillStyle = data.teamColor
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(data.team, ax + avatarSize - badgeW + 52, ay + avatarSize + 10)

  // Name + role
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '400 112px Anton'
  ctx.fillText(`@${data.handle}`.toUpperCase(), 80, 920, W - 160)
  ctx.fillStyle = LIME
  ctx.font = '700 36px "Space Grotesk"'
  ctx.fillText(`${data.role} · ${data.season}`, 80, 975)

  // Stats
  const sw = (W - 160 - 40) / 3
  stat(ctx, 'Team', data.team, 80, 1020, sw)
  stat(ctx, 'Status', data.status, 80 + sw + 20, 1020, sw)
  stat(ctx, 'Card', `#${String(data.number).padStart(4, '0')}`, 80 + (sw + 20) * 2, 1020, sw)

  // Tape
  ctx.fillStyle = LIME
  ctx.fillRect(28, 1196, W - 56, 72)
  ctx.fillStyle = INK
  ctx.font = '400 40px Anton'
  ctx.fillText('TAKE THE STREET  ✦  PAINT THE PIXEL  ✦  ROBINHOOD CHAIN', 70, 1247, W - 140)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render card'))), 'image/png'),
  )
}
