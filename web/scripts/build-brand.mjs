// Generates the Wall Street Place brand kit into ../brand (SVG with outlined text + PNG renders).
// Run: node scripts/build-brand.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const BRAND = resolve(here, '../../brand')
const SVG_DIR = resolve(BRAND, 'svg')
const PNG_DIR = resolve(BRAND, 'png')
mkdirSync(SVG_DIR, { recursive: true })
mkdirSync(PNG_DIR, { recursive: true })

const anton = opentype.loadSync(resolve(BRAND, 'fonts/Anton-Regular.ttf'))
const groteskBold = opentype.loadSync(resolve(BRAND, 'fonts/SpaceGrotesk-Bold.ttf'))
const groteskMedium = opentype.loadSync(resolve(BRAND, 'fonts/SpaceGrotesk-Medium.ttf'))

export const C = {
  ink: '#0E0E10',
  paper: '#F5F2EA',
  lime: '#D4FF3A',
  purple: '#5B2EFF',
  green: '#3DDC84',
  red: '#FF3B30',
  gold: '#FFD23F',
  white: '#FFFFFF',
}

// ---------------------------------------------------------------- the bull (same map as the site)
const BULL = [
  'HH..............HH',
  'HHH............HHH',
  '.HHH..........HHH.',
  '..HHDDDDDDDDDDHH..',
  '..EDBBBBBBBBBBDE..',
  '.EDBBBBBBBBBBBBDE.',
  '.DBBWWBBBBBBWWBBD.',
  '.DBBWPBBBBBBWPBBD.',
  '.DBBBBBBBBBBBBBBD.',
  '..DBBBBBBBBBBBBD..',
  '...DBBNNNNNNBBD...',
  '...DBNNDNNDNNBD...',
  '...DBNNNRRNNNBD...',
  '....DNNNRRNNND....',
  '.....DDDDDDDD.....',
]
const BULL_W = BULL[0].length
const BULL_H = BULL.length
const BULL_COLORS = { H: C.gold, D: C.ink, E: '#2BAA5C', B: C.green, W: C.white, P: C.ink, N: '#FF9EB5', R: C.gold }

/** Bull as crisp rects at (x, y) with `cell` px per pixel; optional hard shadow. */
function bull(x, y, cell, { shadow = 0 } = {}) {
  let out = ''
  const rows = (fill, dx, dy) =>
    BULL.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return
        out += `<rect x="${x + rx * cell + dx}" y="${y + ry * cell + dy}" width="${cell}" height="${cell}" fill="${fill ?? BULL_COLORS[ch]}"/>`
      }),
    )
  if (shadow) rows('rgba(14,14,16,0.55)', shadow, shadow)
  rows(null, 0, 0)
  return `<g shape-rendering="crispEdges">${out}</g>`
}

// ---------------------------------------------------------------- text as paths
function text(font, str, x, y, size, fill, { anchor = 'start', letterSpacing = 0 } = {}) {
  const width = measure(font, str, size, letterSpacing)
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  let d = ''
  for (const ch of str) {
    const p = font.getPath(ch, cx, y, size)
    d += p.toPathData(2)
    cx += font.getAdvanceWidth(ch, size) + letterSpacing
  }
  return `<path d="${d}" fill="${fill}"/>`
}

function measure(font, str, size, letterSpacing = 0) {
  return [...str].reduce((w, ch) => w + font.getAdvanceWidth(ch, size) + letterSpacing, 0) - letterSpacing
}

/** Font size that makes `str` exactly `width` wide. */
function fit(font, str, width, letterSpacing = 0) {
  return (width / measure(font, str, 100, letterSpacing)) * 100
}

function dots(w, h, color, gap = 22, r = 1.6, opacity = 0.16) {
  return `<defs><pattern id="dots" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#dots)" opacity="${opacity}"/>`
}

/** A 4-point sparkle used as the ribbon separator. */
function sparkle(cx, cy, r, fill) {
  const k = r * 0.28
  return `<path d="M${cx} ${cy - r} L${cx + k} ${cy - k} L${cx + r} ${cy} L${cx + k} ${cy + k} L${cx} ${cy + r} L${cx - k} ${cy + k} L${cx - r} ${cy} L${cx - k} ${cy - k} Z" fill="${fill}"/>`
}

/** A slanted marquee ribbon of repeated slogans. */
function ribbon(y, angle, width, height, bg, fg, words, size, sepColor) {
  let x = -40
  let items = ''
  while (x < width + 200) {
    for (const w of words) {
      items += text(anton, w, x, y + height / 2 + size * 0.36, size, fg)
      x += measure(anton, w, size) + size * 0.55
      items += sparkle(x, y + height / 2, size * 0.32, sepColor)
      x += size * 0.55
    }
  }
  return `<g transform="rotate(${angle} ${width / 2} ${y + height / 2})"><rect x="-200" y="${y}" width="${width + 400}" height="${height}" fill="${bg}" stroke="${C.ink}" stroke-width="4"/>${items}</g>`
}

/** The team skyline from the site's opening scene. */
const TEAM_COLORS = ['#76B900', '#E82127', '#8E8E93', '#FF9900', '#00A4EF', '#4285F4', '#0866FF', '#B8860B']
function skyline(x, y, w, h) {
  const n = TEAM_COLORS.length
  const gap = w * 0.025
  const bw = (w - gap * (n - 1)) / n
  const heights = [0.62, 0.95, 0.55, 0.78, 0.48, 0.7, 0.4, 0.85]
  return TEAM_COLORS.map((c, i) => {
    const bh = h * heights[i]
    const bx = x + i * (bw + gap)
    const by = y + h - bh
    let windows = ''
    const cell = bw / 5
    for (let wy = by + cell; wy < y + h - cell; wy += cell * 2)
      for (let wx = bx + cell; wx < bx + bw - cell * 0.5; wx += cell * 2)
        windows += `<rect x="${wx}" y="${wy}" width="${cell}" height="${cell}" fill="${C.gold}" opacity="0.9"/>`
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${c}" stroke="${C.ink}" stroke-width="3"/>${windows}`
  }).join('')
}

function svg(w, h, body, bg) {
  const fill = bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fill}${body}</svg>\n`
}

// ---------------------------------------------------------------- assets
const assets = {}

// Marks
const pad = 1
assets['mark-bull'] = svg(BULL_W + pad * 2, BULL_H + pad * 2, bull(pad, pad, 1))
assets['mark-pixels'] = svg(20, 20, `<g shape-rendering="crispEdges"><rect x="0" y="0" width="9" height="9" fill="${C.green}"/><rect x="11" y="0" width="9" height="9" fill="${C.red}"/><rect x="0" y="11" width="9" height="9" fill="${C.gold}"/><rect x="11" y="11" width="9" height="9" fill="${C.purple}"/></g>`)

// App icon / X profile picture: bull on lime
assets['app-icon'] = svg(512, 512, bull(76, 96, 20, { shadow: 12 }), C.lime)
assets['x-profile'] = svg(400, 400, bull(56, 70, 16, { shadow: 10 }), C.lime)

// Wordmarks (two lines, stacked): dark-background and light-background versions
function wordmark(top, bottom) {
  const w = 1200
  const gap = 18
  const s1 = fit(anton, 'WALL STREET', w)
  const s2 = fit(anton, 'PLACE', w * 0.62)
  // Measure real glyph outlines so nothing is clipped.
  const b1 = anton.getPath('WALL STREET', 0, 0, s1).getBoundingBox()
  const b2 = anton.getPath('PLACE', 0, 0, s2).getBoundingBox()
  const y1 = -b1.y1
  const y2 = y1 + b1.y2 + gap - b2.y1
  const body = text(anton, 'WALL STREET', 0, y1, s1, top) + text(anton, 'PLACE', 0, y2, s2, bottom)
  return { w, h: Math.ceil(y2 + b2.y2), body }
}
const wmDark = wordmark(C.white, C.lime)
const wmLight = wordmark(C.ink, C.purple)
assets['wordmark-on-dark'] = svg(wmDark.w, wmDark.h, wmDark.body)
assets['wordmark-on-light'] = svg(wmLight.w, wmLight.h, wmLight.body)

// Horizontal lockup: bull + one-line wordmark
function lockup(fg, accent, bg) {
  const size = 150
  const cell = 9
  const bw = (BULL_W + 0) * cell
  const tx = bw + 50
  const textW = measure(anton, 'WALL STREET ', size) + measure(anton, 'PLACE', size)
  const W = Math.round(tx + textW + 40)
  const H = 210
  const body =
    bull(20, (H - BULL_H * cell) / 2, cell, { shadow: 6 }) +
    text(anton, 'WALL STREET', tx, H / 2 + size * 0.36, size, fg) +
    text(anton, 'PLACE', tx + measure(anton, 'WALL STREET ', size), H / 2 + size * 0.36, size, accent)
  return svg(W, H, body, bg)
}
assets['lockup-on-dark'] = lockup(C.white, C.lime, C.ink)
assets['lockup-on-light'] = lockup(C.ink, C.purple, C.paper)
assets['lockup-transparent'] = lockup(C.ink, C.purple, null)

// $PLACE token icon
assets['token-place'] = svg(
  512,
  512,
  `<circle cx="256" cy="256" r="250" fill="${C.ink}"/><circle cx="256" cy="256" r="232" fill="${C.gold}"/><circle cx="256" cy="256" r="208" fill="${C.purple}" stroke="${C.ink}" stroke-width="8"/>` +
    dots(512, 512, C.white, 18, 1.6, 0.12).replace('<rect', '<rect clip-path="url(#coin)"') +
    `<clipPath id="coin"><circle cx="256" cy="256" r="204"/></clipPath>` +
    bull(256 - (BULL_W * 15) / 2, 132, 15, { shadow: 8 }) +
    text(anton, '$PLACE', 256, 420, 64, C.lime, { anchor: 'middle' }),
)

// X header banner (1500×500). Keep the bottom-left clear: the profile picture overlaps it.
{
  const W = 1500
  const H = 500
  const body =
    dots(W, H, C.white, 24, 1.8, 0.1) +
    `<circle cx="1190" cy="230" r="290" fill="${C.purple}" opacity="0.55"/>` +
    skyline(960, 215, 490, 175) +
    bull(1115, 28, 11, { shadow: 8 }) +
    text(anton, 'PAINT', 170, 205, 170, C.white) +
    text(anton, 'THE STREET', 170, 345, 150, C.lime) +
    text(groteskBold, 'Every stock is a team · Robinhood Chain', 174, 392, 30, C.white) +
    ribbon(410, -2.5, W, 64, C.lime, C.ink, ['HOLD THE STOCK', 'PAINT THE PIXEL', 'TAKE THE STREET', 'RING THE BELL'], 38, C.purple)
  assets['x-banner'] = svg(W, H, body, C.ink)
}

// Link preview / Open Graph image (1200×630)
{
  const W = 1200
  const H = 630
  const body =
    dots(W, H, C.white, 22, 1.7, 0.16) +
    `<circle cx="955" cy="255" r="260" fill="${C.ink}" opacity="0.35"/>` +
    bull(770, 110, 20, { shadow: 12 }) +
    text(groteskBold, 'WALL STREET PLACE', 70, 110, 30, C.lime, { letterSpacing: 4 }) +
    text(anton, 'PAINT', 66, 290, 190, C.white) +
    text(anton, 'THE STREET', 66, 440, 150, C.lime) +
    text(groteskMedium, 'A 10,000-pixel canvas where every stock is a team.', 70, 492, 30, C.white) +
    ribbon(540, -2, W, 66, C.lime, C.ink, ['HOLD NVDA', 'PAINT FOR NVDA', 'TAKE THE STREET', 'ROBINHOOD CHAIN'], 38, C.purple)
  assets['og-image'] = svg(W, H, body, C.purple)
}

// ---------------------------------------------------------------- write SVG + PNG
const PNG_SIZES = {
  'mark-bull': [512, 1024],
  'mark-pixels': [64, 512],
  'app-icon': [512, 1024],
  'x-profile': [400],
  'wordmark-on-dark': [1200],
  'wordmark-on-light': [1200],
  'lockup-on-dark': [1600],
  'lockup-on-light': [1600],
  'lockup-transparent': [1600],
  'token-place': [256, 512],
  'x-banner': [1500, 3000],
  'og-image': [1200],
}

for (const [name, content] of Object.entries(assets)) {
  writeFileSync(resolve(SVG_DIR, `${name}.svg`), content)
  for (const width of PNG_SIZES[name] ?? []) {
    const png = new Resvg(content, { fitTo: { mode: 'width', value: width }, shapeRendering: 0 }).render().asPng()
    const suffix = (PNG_SIZES[name].length > 1 ? `-${width}` : '')
    writeFileSync(resolve(PNG_DIR, `${name}${suffix}.png`), png)
  }
  console.log(`✓ ${name}`)
}
