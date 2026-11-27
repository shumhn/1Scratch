# 1Scratch — Build Plan

> Scratch cards that pay prizes in tokenized stocks & high-demand Solana assets.
> Solana RFS: **Entertainment Finance** — everyday spending × asset investing,
> an experience people *return to* (even a money-back win keeps moving with the market).

## Architecture

```
BASE LAYER (Solana devnet)                EPHEMERAL ROLLUP (MagicBlock)
─────────────────────────                 ─────────────────────────────
buy_card (1 USDC → treasury)
  → Card PDA (Sealed) ─── delegate ────►  scratch() → VRF request
                                            (ephemeral queue = FREE)
  Keeper → Asset.price_usd_e8                 ▼
  (Jupiter quotes, 30s loop)            vrf_callback → tier walk →
                                            multiplier_bps + prize_usd_e6
                                            │ settle_card (commit+undelegate)
claim_payout ◄──────────────────────────────┘
  reads Asset price → amount = prize/price
  → SPL transfer house vault → player
sell_asset (base) → mock asset back to house vault
  → fresh keeper quote + user minimum → mock USDC from treasury
```

**Why the callback only records the outcome:** it runs on the ER and must stay
small/reliable (skill guidance). Prices live on base (keeper-written), so the
token math happens at `claim_payout` on base. Prize table + price paid are
snapshotted into the Card at buy time — House is never delegated.

## Program (Anchor 1.1.2 + ER SDK 0.18.0, features: anchor, vrf)

| Account | Seeds | Notes |
|---|---|---|
| `House` | `[b"house"]` | authority, keeper, prize table (8 tiers, ppm weights), USDC treasury, nonce |
| `Asset` | `[b"asset", mint]` | vault ATA, keeper price (e8) + timestamp, kind (stock/coin) |
| `Card`  | `[b"card", owner, id]` | state machine: Sealed → RandomnessRequested → Revealed → Claimed |

Instructions: `initialize_house`, `add_asset`, `set_price` (keeper),
`buy_card`, `delegate_card`, `scratch` (VRF), `vrf_callback`, `settle_card`,
`claim_payout`, `sell_asset` (devnet dealer redemption).

## Locked decisions

- **SDK `=0.18.0`** — 0.20's `#[vrf]` doesn't compile; 0.17 API names differ.
- **anchor-lang/spl `=1.1.2`** — 1.0.2 lacks `create_account_allow_prefund`
  (used by SDK macros); caret deps silently resolve to 1.2.2 (new CpiContext API).
- **VRF queue:** `DEFAULT_EPHEMERAL_QUEUE` on the ER = fee-exempt scratches.
- **Prices:** keeper = Jupiter sell quotes (`lite-api.jup.ag`, no key) with a
  configured demo fallback when no route answers. Stock references use their
  mainnet xStock mints; crypto uses canonical mints. As in Unwind-Fi, the
  executable quote and an underlying equity reference are different prices.
  The fallback is simulated and must be shown as such before any public launch.
- **Prizes:** mock devnet SPL mints mirroring real assets (see `config/assets.json`).
- **Devnet exit:** the house treasury buys mock winnings back at the keeper
  price, with a user minimum output and finite mock USDC reserve. This proves
  hold → price change → sell, but it is not a DEX sale or real-stock redemption.
- **Economics:** 1 USDC/card, configured theoretical RTP 69.9% before fees, 1000x
  at 1-in-100,000. Tunable on-chain.

## Fee realities (from the skill)

- Delegation deposit ≈ 2.8–3.3M lamports per card (~$0.0004), paid by player,
  partially refunded on undelegate.
- Commit #11+ per account fails without a fee vault — our cards commit exactly
  once (settle) then undelegate. Non-issue.
- Cards are ~200 bytes, far under the 10,240-byte commit cap.

## Known V1 cuts (documented, deliberate)

- VRF retry after 90 seconds is implemented in local source; live retry still
  needs validation after the next devnet upgrade.
- Mystery-asset cards deferred to V2 (needs a delegated asset registry).
- No session keys yet (1-click re-scratch UX later).
- No per-card rarity visuals / streaks (frontend phase).
- Production faucet is disabled by default. If public demo funding is enabled,
  add durable rate limits and a funding budget; per-wallet balance checks do not
  stop new-wallet spam.

## Verified devnet flow (2026-11-27)

- `npm run e2e -- TSLAx`: card #11 paid a 2x mock prize, with VRF roll,
  settled card state, and token balance checked.
- `npm run e2e:sell -- TSLAx`: sold that entire 2x prize for 1.999997 mock
  USDC; player, vault, and treasury balances reconciled.
- `npm run test:sell-guard`: devnet simulation rejected a quote below the
  player's minimum output.
- A prior 1x win sold later for 1.001065 mock USDC, showing the live reference
  quote can move after claim.
- After the final binary upgrade, card #12 completed the same full route:
  1x TSLAx prize, then 0.999998 mock USDC on sale with balanced vault and
  treasury transfers.
- The app's scratch modal now has a MagicBlock VRF receipt. It shows Solana
  buy/delegate and claim signatures, MagicBlock ER scratch/callback/settle
  signatures, ER RPC, saved randomness, roll, and recomputed payout from the
  card's snapshotted prize table. Solana signatures link to devnet Explorer;
  ER signatures link to Explorer with the card's ER RPC as `customUrl` and can
  be copied for direct ER RPC lookup. The callback log and
  arithmetic check do not independently verify the oracle's cryptographic proof.
- The player-facing lobby is stock-only and scratch-first: choose AAPLx,
  TSLAx, or CRCLx, preview three hidden ticker positions, then buy a $1 card.
  Keeper reference prices appear beside ticker selection and in the portfolio.
  The active prize table is public on both the landing and game pages.
  In this V1 contract, the target ticker is fixed at purchase;
  VRF determines the matching/blank display and prize tier. VRF selection of
  the stock itself remains a separate on-chain feature.
- `npm run e2e -- AAPLx`: card #13 completed buy → delegate → VRF callback →
  settle → claim (blank 0x result). `npx tsx scripts/verify_receipt.ts
  2QrwExUdu93o8mSdfEh6kvbNLTbN1UnVRrfyjQsDSUPE 13` recovered all five
  transaction signatures from base/ER history and matched roll 1,010,403 to
  the on-chain 0x payout. App production build and TypeScript check pass.
- Card #14 also completed the full AAPLx flow. Its public chain history can be
  checked with `scripts/verify_receipt.ts`; the temporary browser replay has
  been removed. The app opens at the landing page, with gameplay at `/play`.

Still needed for a real-stock product: issuer-backed prize mints, an actual
market or redemption route, and explicit reference-price versus executable
sale-price handling. The current dealer has finite mock USDC inventory.
