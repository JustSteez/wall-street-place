# Wall Street Place: brand kit

Everything here is generated from code by `web/scripts/build-brand.mjs` (text is outlined, so SVGs render the same everywhere). Re-run it after any change:

```bash
cd web && node scripts/build-brand.mjs
```

## Files

| Asset | Use it for | Files |
|---|---|---|
| Bull mark | Primary logo, avatars, stickers | `svg/mark-bull.svg`, `png/mark-bull-512.png`, `png/mark-bull-1024.png` |
| Pixel mark | Favicon, tiny sizes (under 32px) | `svg/mark-pixels.svg`, `png/mark-pixels-64.png`, `png/mark-pixels-512.png` |
| Lockup | Headers, partner logos, decks | `lockup-on-dark`, `lockup-on-light`, `lockup-transparent` (svg + png) |
| Stacked wordmark | Posters, big type moments | `wordmark-on-dark`, `wordmark-on-light` (svg + png) |
| App icon | Telegram, Discord, app stores | `svg/app-icon.svg`, `png/app-icon-512.png`, `png/app-icon-1024.png` |
| X profile picture | X / Telegram avatar (400×400) | `png/x-profile.png` |
| X header | X banner (1500×500, plus 3000×1000 retina) | `png/x-banner-1500.png`, `png/x-banner-3000.png` |
| Link preview | Open Graph / X card (1200×630) | `png/og-image.png` (also live on the site as `og.png`) |
| $PLACE token | Token lists, explorers, DEXs | `svg/token-place.svg`, `png/token-place-256.png`, `png/token-place-512.png` |

## Colours

| Name | Hex | Role |
|---|---|---|
| Ink | `#0E0E10` | Text, outlines, dark backgrounds |
| Paper | `#F5F2EA` | Light backgrounds |
| Lime | `#D4FF3A` | Primary accent, CTAs, "PLACE" on dark |
| Purple | `#5B2EFF` | Secondary accent, "PLACE" on light, ribbons |
| Bull green | `#3DDC84` | Mascot, "buy" / success |
| Signal red | `#FF3B30` | Errors, alerts |
| Gold | `#FFD23F` | Horns, $PLACE, highlights |

Team colours (canvas only): NVDA `#76B900`, TSLA `#E82127`, AAPL `#8E8E93`, AMZN `#FF9900`, MSFT `#00A4EF`, GOOGL `#4285F4`, META `#0866FF`, SPY `#B8860B`.

## Type

- **Anton**: headlines and the wordmark, always UPPERCASE.
- **Space Grotesk** (500 / 700): everything else.

Both are free (SIL Open Font License); the TTFs are in `fonts/`.

## Voice

Short, loud, trading-floor energy. "Paint the street." "Hold the stock, paint the pixel." "Ring the bell."

## Do / don't

- **Do** keep the bull's pixels crisp. Scale by whole numbers and never blur or smooth it.
- **Do** put the bull on lime, purple, paper or ink.
- **Don't** recolour the bull, stretch it, or rotate it more than about 5°.
- **Don't** put lime text on paper. Use purple or ink there.
- **Don't** use the Robinhood or NYSE logos in brand assets. Wall Street Place is not affiliated with either.
