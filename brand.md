# 1Scratch — design system

Name selected by the user: **1Scratch**. Use **1scratch** for the wordmark, **1Scratch** in page titles and prose, and **1SCRATCH** on the illustrated ticket. Tagline: **Scratch. Match. Own.**

Updated 2026-11-27 using Unwind's landing and trading screens as a visual quality reference. 1Scratch has its own identity and ticket artwork.

## Direction

Warm graphite surfaces, brushed gold tickets, large editorial typography, compact financial controls. Spacious landing page at `/`; a dedicated game desk at `/play`. A ticket, rather than market charts, is the central visual. Decorative sealed tickets are marked as illustrations and never imply a preselected prize.

The final polish uses a graphite ticket face, engraved security pattern, champagne foil, and gold backing card. Gentle pointer tilt responds only to mouse input and respects reduced motion. The actual scratch canvas uses the same gold material. Landing ticker links preserve the selected ticker in `/play?ticker=...`; the desk explains Select → Scratch → Claim before purchase.

Use real account data for prices, entry cost, prize tiers, match chance, portfolio holdings, and transaction evidence. Do not add fabricated trades, gains, charts, or activity counts.

## Tokens

All colors are defined in `app/app/globals.css`.

| Token | HSL | Role |
|---|---|---|
| background | 40 8% 5% | warm near-black page |
| foreground | 40 20% 94% | soft white text |
| card | 40 5% 9% | financial panels |
| popover | 40 4% 12% | elevated surfaces |
| muted | 40 4% 16% | inputs and loading placeholders |
| muted-foreground | 40 5% 64% | secondary text |
| border | 40 5% 18% | panel dividers |
| primary | 44 81% 65% | gold, primary actions and prizes |
| primary-foreground | 40 30% 9% | text on gold |

Gold-light, gold-mid, and gold-deep form the illustrated ticket's material. Brand colors on the stock identity marks are contextual, not competing action colors. Success uses `prize-nice`. Focus rings use `ring`.

## Typography and layout

- Inter: interface text. Instrument Sans: display type with tight tracking. JetBrains Mono: small labels, reference prices, and transaction signatures.
- Main container: 1440px including 48px side gutters. Gutters reduce to 32px on tablet and 20px on phone.
- Landing: large asymmetric hero with an original CSS/SVG ticket, live ticker ribbon, actual game metrics, rules, and public odds.
- Play: restrained header, actual game metrics, ticker choice beside a sealed-ticket illustration, portfolio and public odds.
- Cards: 20px radius. Controls: 10–12px radius. Borders establish hierarchy; avoid large UI shadows.
- Motion: 150ms interaction feedback and loading pulses. Respect reduced motion. No automatic card outcomes or animated market claims.

## Voice and terminology

Concise and welcoming: “A little scratch. A stock of your own.” Explain the rules in plain language, with details next to decisions. Use “devnet tokens”, “devnet USDC”, and “devnet demo” in user-facing copy. The footer says tokens are not company shares. Explain that 1x means entry value in tokens, and show odds before purchase. Do not call a 1x prize one whole share.

## Interaction requirements

Real links and buttons, global visible keyboard focus, clear selected ticker state, inline errors and recovery, wallet confirmation for transactions. The scratch dialog traps focus and returns it when closed. No replay card automatically opens on the landing page.
