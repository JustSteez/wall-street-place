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

// ---------------------------------------------------------------- X posts (1600×900)
const posts = {}
const PW = 1600
const PH = 900
const SITE = 'WALL-STREET-PLACE.VERCEL.APP'

/** Card with a hard offset shadow, like the site's neo-brutal panels. */
function brutalCard(x, y, w, h, fill, { r = 28, shadow = 12, stroke = 6 } = {}) {
  return (
    `<rect x="${x + shadow}" y="${y + shadow}" width="${w}" height="${h}" rx="${r}" fill="${C.ink}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="${stroke}"/>`
  )
}

/** Text with a hard ink drop shadow (matches the site's chunky tickers). */
function shadowText(font, str, x, y, size, fill, offset = 5, opts = {}) {
  return text(font, str, x + offset, y + offset, size, C.ink, opts) + text(font, str, x, y, size, fill, opts)
}

/** Several lines of body text. */
function lines(font, list, x, y, size, fill, leading = 1.35) {
  return list.map((l, i) => text(font, l, x, y + i * size * leading, size, fill)).join('')
}

function pixelArt(map, colors, x, y, cell) {
  let out = ''
  map.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch !== '.') out += `<rect x="${x + rx * cell}" y="${y + ry * cell}" width="${cell}" height="${cell}" fill="${colors[ch]}"/>`
    }),
  )
  return `<g shape-rendering="crispEdges">${out}</g>`
}

const BELL = ['....D....', '...DGD...', '..DGGGD..', '..DGGGD..', '..DGGGD..', '.DGGGGGD.', 'DGGGGGGGD', 'DDDDDDDDD', '....D....']

// 1 · Teaser
posts['post-1-teaser'] = svg(
  PW,
  PH,
  dots(PW, PH, C.white, 26, 2, 0.1) +
    `<circle cx="1250" cy="420" r="360" fill="${C.purple}" opacity="0.5"/>` +
    text(groteskBold, 'WALL STREET PLACE', 96, 120, 30, C.lime, { letterSpacing: 5 }) +
    text(anton, '10,000 PIXELS.', 90, 300, 150, C.white) +
    text(anton, '8 TEAMS.', 90, 470, 150, C.lime) +
    text(anton, 'ONE STREET.', 90, 640, 150, C.white) +
    skyline(940, 380, 560, 330) +
    bull(1110, 110, 15, { shadow: 10 }) +
    ribbon(765, -2, PW, 84, C.lime, C.ink, ['LAUNCHING SOON ON ROBINHOOD CHAIN', SITE], 48, C.purple),
  C.ink,
)

// 2 · How it works
{
  const cardW = 440
  const cardH = 500
  const top = 270
  const xs = [90, 580, 1070]
  const steps = [
    { n: '01', title: 'HOLD A STOCK', body: ['Keep any Robinhood stock', 'token in your wallet.', 'It never leaves.'], band: C.lime },
    { n: '02', title: 'PAINT A PIXEL', body: ['Paint for your stock’s team.', 'One pixel every 30s.', 'Burn $PLACE to boost.'], band: C.purple },
    { n: '03', title: 'WIN THE WEEK', body: ['Most pixels at Friday’s', 'closing bell wins. The', 'canvas becomes art.'], band: C.gold },
  ]
  const art = [
    // NVDA holding chip
    (x, y) =>
      `<rect x="${x}" y="${y}" width="230" height="74" rx="37" fill="#76B900" stroke="${C.ink}" stroke-width="5"/>` +
      text(anton, 'NVDA ✓'.replace(' ✓', ''), x + 30, y + 54, 46, C.white) +
      `<path d="M${x + 160} ${y + 38} l14 14 l26 -28" fill="none" stroke="${C.white}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    // pixel grid
    (x, y) => {
      const cols = ['#76B900', '#E82127', '#FF9900', '#00A4EF', C.lime, '#76B900', '#76B900', '#E82127', '#00A4EF', '#76B900', C.white, '#FF9900']
      return cols
        .map((c, i) => `<rect x="${x + (i % 6) * 40}" y="${y + Math.floor(i / 6) * 40}" width="34" height="34" rx="5" fill="${c}" stroke="${C.ink}" stroke-width="4"/>`)
        .join('')
    },
    // bell
    (x, y) => pixelArt(BELL, { D: C.ink, G: C.gold }, x + 60, y - 10, 10),
  ]
  let body = dots(PW, PH, C.ink, 26, 2, 0.08) + text(anton, 'HOW TO TAKE THE STREET', 90, 190, 120, C.ink)
  steps.forEach((s, i) => {
    const x = xs[i]
    body +=
      brutalCard(x, top, cardW, cardH, C.white) +
      `<path d="M${x + 3} ${top + 28} a25 25 0 0 1 25 -25 h${cardW - 56} a25 25 0 0 1 25 25 v130 h-${cardW - 6} z" fill="${s.band}"/>` +
      `<line x1="${x}" y1="${top + 158}" x2="${x + cardW}" y2="${top + 158}" stroke="${C.ink}" stroke-width="6"/>` +
      shadowText(anton, s.n, x + 34, top + 128, 100, i === 1 ? C.white : C.ink, i === 1 ? 5 : 0) +
      art[i](x + 180, top + 46) +
      text(anton, s.title, x + 34, top + 242, 62, C.ink) +
      lines(groteskMedium, s.body, x + 36, top + 310, 28, '#3b372f')
  })
  body += text(groteskBold, `LAUNCHING SOON  ·  ${SITE}`, PW / 2, 852, 30, C.purple, { anchor: 'middle', letterSpacing: 2 })
  posts['post-2-how-it-works'] = svg(PW, PH, body, C.paper)
}

// 3 · Pick your side
{
  const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'AMZN', 'MSFT', 'GOOGL', 'META', 'SPY']
  const cw = 330
  const ch = 220
  const gx = 36
  const gy = 40
  const x0 = (PW - (cw * 4 + gx * 3)) / 2
  const y0 = 300
  let body =
    dots(PW, PH, C.white, 24, 1.8, 0.14) +
    text(anton, 'PICK YOUR SIDE', 90, 170, 130, C.white) +
    text(groteskMedium, 'Every stock is a team. Hold any amount of its token to paint in its name.', 94, 232, 30, C.white)
  TICKERS.forEach((t, i) => {
    const x = x0 + (i % 4) * (cw + gx)
    const y = y0 + Math.floor(i / 4) * (ch + gy)
    const size = fit(anton, t, cw - 70) > 92 ? 92 : fit(anton, t, cw - 70)
    body +=
      brutalCard(x, y, cw, ch, C.white, { r: 22, shadow: 10 }) +
      `<path d="M${x + 3} ${y + 22} a19 19 0 0 1 19 -19 h${cw - 44} a19 19 0 0 1 19 19 v110 h-${cw - 6} z" fill="${TEAM_COLORS[i]}"/>` +
      `<line x1="${x}" y1="${y + 132}" x2="${x + cw}" y2="${y + 132}" stroke="${C.ink}" stroke-width="5"/>` +
      shadowText(anton, t, x + 28, y + 112, size, C.white, 5) +
      text(groteskBold, 'TEAM ' + t, x + 30, y + 186, 26, C.ink, { letterSpacing: 2 })
  })
  body += ribbon(820, -1.5, PW, 70, C.lime, C.ink, ['WHICH TEAM ARE YOU ON?', SITE], 40, C.purple)
  posts['post-3-pick-your-side'] = svg(PW, PH, body, C.purple)
}

// 4 · Trader card
{
  const cx = 1010
  const cy = 90
  const cw = 480
  const ch = 640
  const inner = `<g transform="rotate(5 ${cx + cw / 2} ${cy + ch / 2})">` +
    `<rect x="${cx + 16}" y="${cy + 16}" width="${cw}" height="${ch}" rx="40" fill="${C.ink}"/>` +
    `<defs><linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3DDC84"/><stop offset="0.5" stop-color="${C.purple}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient></defs>` +
    `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="40" fill="url(#foil)" stroke="${C.ink}" stroke-width="6"/>` +
    `<rect x="${cx + 16}" y="${cy + 16}" width="${cw - 32}" height="${ch - 32}" rx="28" fill="${C.ink}"/>` +
    text(groteskBold, 'WALL STREET PLACE · TRADER CARD', cx + 40, cy + 62, 15, C.lime, { letterSpacing: 1 }) +
    text(groteskBold, '#0427', cx + cw - 40, cy + 62, 18, C.lime, { anchor: 'end' }) +
    `<rect x="${cx + 105}" y="${cy + 88}" width="270" height="270" rx="18" fill="#76B900" stroke="${C.white}" stroke-width="7"/>` +
    bull(cx + 105 + (270 - BULL_W * 12) / 2, cy + 88 + (270 - BULL_H * 12) / 2, 12, { shadow: 6 }) +
    `<rect x="${cx + 300}" y="${cy + 322}" width="110" height="54" rx="12" fill="#76B900" stroke="${C.ink}" stroke-width="5"/>` +
    text(anton, 'NVDA', cx + 355, cy + 362, 34, C.white, { anchor: 'middle' }) +
    text(anton, '@YOURHANDLE', cx + 40, cy + 450, 58, C.white) +
    text(groteskBold, 'Floor Trader · Season 1', cx + 42, cy + 490, 22, C.lime) +
    [['TEAM', 'NVDA'], ['STATUS', 'HOLDER ✓'.replace(' ✓', '')], ['CARD', '#0427']]
      .map(([k, v], i) => {
        const bx = cx + 40 + i * 136
        return `<rect x="${bx}" y="${cy + 512}" width="124" height="74" rx="12" fill="#1B1B20"/>` +
          text(groteskBold, k, bx + 14, cy + 538, 15, 'rgba(255,255,255,0.6)', { letterSpacing: 1 }) +
          text(anton, v, bx + 14, cy + 574, 28, C.white)
      })
      .join('') +
    `</g>`
  posts['post-4-trader-card'] = svg(
    PW,
    PH,
    dots(PW, PH, C.ink, 24, 1.8, 0.12) +
      text(groteskBold, 'NEW · FREE · TAKES 5 SECONDS', 96, 170, 28, C.purple, { letterSpacing: 3 }) +
      text(anton, 'GET YOUR', 90, 330, 150, C.ink) +
      text(anton, 'TRADER CARD', 90, 490, 150, C.purple) +
      lines(groteskMedium, ['Drop your X handle. We pixelate your PFP,', 'stamp your team and print your card.'], 96, 570, 34, C.ink) +
      `<rect x="96" y="680" width="${measure(groteskBold, SITE + '/#CARD', 30) + 70}" height="76" rx="38" fill="${C.ink}"/>` +
      text(groteskBold, SITE + '/#CARD', 131, 729, 30, C.lime) +
      inner,
    C.lime,
  )
}

// ---------------------------------------------------------------- write SVG + PNG
const POSTS_DIR = resolve(BRAND, 'posts')
mkdirSync(POSTS_DIR, { recursive: true })
for (const [name, content] of Object.entries(posts)) {
  writeFileSync(resolve(POSTS_DIR, `${name}.svg`), content)
  const png = new Resvg(content, { fitTo: { mode: 'width', value: PW }, shapeRendering: 0 }).render().asPng()
  writeFileSync(resolve(POSTS_DIR, `${name}.png`), png)
  console.log(`✓ ${name}`)
}

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
