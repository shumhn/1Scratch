# 1Scratch

**Scratch. Match. Own.**

[Play on devnet](https://1scratch.vercel.app/play) · [Website](https://1scratch.vercel.app) · [MagicBlock integration proof](docs/INTEGRATION.md) · [Run locally](#run-locally)

**1Scratch is a stock scratcher on Solana.** Choose a stock ticker, buy a $1 card using devnet USDC, and scratch to reveal three symbols. Three matching tickers mean a win. Claim your prize as devnet stock tokens, then hold them in your wallet or sell them to the devnet treasury.

**MagicBlock VRF determines the prize. MagicBlock Ephemeral Rollups (ER) run the card's gameplay.** Check the actual [VRF callback on ER](https://explorer.solana.com/tx/2qry4Xuu5dZ6du3TunAP5hnSy1xy7XCGpseQ26BkiyrYsbG6U7DrVA7adPBdwX7d9jqxrZ1qnsah3MVCEF4HjdxE?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F), [ER settlement](https://explorer.solana.com/tx/Nfbsie1wBnwUNmskNw3eTVE5aBcj6Y3KrQmLwm1Kn4r1ytLn1kcLMBfhGPofaiKLbQ8dTSquiTU2WCWLWsZiESa?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app%2F), and [wallet payout on Solana](https://explorer.solana.com/tx/4Z25qV2jP7m2RbQZ5ECsBVi9EJacyMWcQ7LQZXNDKx796drqGy6tDjN5Z2bcAQ3UYqBebRYbHE4z2dokbWZRd3BS?cluster=devnet).

![1Scratch landing page with its sealed stock ticket](docs/images/1scratch.png)

> **Devnet edition:** 1Scratch uses devnet USDC and stock-themed devnet tokens. These tokens are not company shares.

## How to play

1. **Connect your wallet.** Open the game in a browser with Phantom or Solflare, using a wallet funded with devnet SOL and the app's devnet USDC.
2. **Choose a stock ticker.** Every available ticker has the same entry cost and prize odds.
3. **Buy and prepare the scratch.** Buy a sealed card for 1 mock devnet USDC, plus a separate network fee and SOL to fund new card/delegation accounts. Wallets without metadata for the mock mint may call the token “Unknown.” In a recent devnet buy, account funding was 0.00491036 SOL: 0.00320856 SOL for delegation accounts, which can be consumed by MagicBlock's session fee when the card is undelegated, and 0.0017018 SOL that remains locked in the card account. In the card dialog, choose **Start scratch** and confirm the separate MagicBlock scratch transaction in your wallet. Wait for the VRF draw to finish.
4. **Reveal your card.** Drag across the middle of the foil to uncover the tickers. The multiplier and prize appear after roughly 45% of the foil is cleared. **Reveal without scratching** is available once the draw is ready.
5. **Match three.** Three copies of your chosen ticker signal a win. One or two matches do not pay a prize.
6. **Claim, hold, or sell.** Claim winning tokens into your wallet, track their reference value in your portfolio, or sell them back to the devnet treasury.

VRF selects the prize tier, and the app displays matching or nonmatching symbols for that result. The three symbols are not independent draws, and scratching technique does not change the prize. You can also resume an unfinished card and inspect its transaction receipt.

## Public prize table

The table shows **what a card can pay and how likely each outcome is**. It is separate from stock reference prices. The app reads the active table from the [on-chain House account](https://explorer.solana.com/address/6ueXccthuD73jY93851FVTztKBPAyv8UxwTzit9UKNc9?cluster=devnet), and each card saves its own copy at purchase.

| Outcome | Chance | Prize value on a $1 card |
| --- | ---: | ---: |
| No match · 0x | 62% | $0 |
| Money back · 1x | 30% | $1 |
| 2x | 5% | $2 |
| 5x | 2% | $5 |
| 10x | 0.9% | $10 |
| 100x | 0.099% | $100 |
| Rare jackpot · 1,000x | 0.001% | $1,000 |

Prizes are paid in devnet stock tokens. The configured winning-card chance is **38%**, including money-back wins; the 1,000x chance is **1 in 100,000 per card**. The theoretical return is 69.9% of entry value before fees. These odds do not guarantee a win across any number of attempts.

## Where MagicBlock fits

| Component | What it does in 1Scratch |
| --- | --- |
| **MagicBlock VRF** | Supplies the randomness used to select a prize from the card's saved table. |
| **MagicBlock ER** | Runs the delegated card's scratch request, VRF callback, and settlement request. |
| **Solana** | Records the purchase, receives the committed result, and handles token claims and treasury sales. |

Buying delegates the card's state to ER. After the reveal, **commit and undelegate** returns it to Solana so the player can claim. Only the card is delegated; the house, prices, and token inventory remain on Solana.

The **Verify this card** panel links the transactions and checks the prize calculation. For a completed buy-to-sale journey, SDK usage, and callback authentication, see [the integration walkthrough](docs/INTEGRATION.md).

## A win becomes a holding

**The entertainment is the scratch and reveal. The finance is what stays in your wallet afterward.** Even a 1x money-back win becomes a token holding whose reference value can change.

A 1x win gives you **$1 worth of the selected devnet token at claim time**, rather than one whole token. At a $200 reference price, that would be approximately 0.005 tokens. Your token quantity stays the same while its displayed value follows the keeper's reference price. The portfolio shows your quantities and reference value; treasury sales include a quote and minimum output.

Reference prices are Jupiter quotes for selling one mainnet xStock into USDC, not exchange share prices. The devnet tokens here are mocks. The keeper does not publish a static fallback as fresh when the live quote is unavailable; claims and sales require a fresh quote and sales also depend on treasury funds. [Keeper and pricing details](docs/DEVELOPMENT.md#keep-reference-prices-fresh).

Inspired by [MagicBlock's Stock Scratchers idea](https://x.com/magicblock/status/2123416325347569893).

## Run locally

Use **Node.js 22.x**:

```sh
npm --prefix app ci
cp app/.env.example app/.env.local
npm run dev:all
```

Open [localhost:3000](http://localhost:3000) or [the game](http://localhost:3000/play). `dev:all` runs the frontend and the authorized price keeper together; it uses the existing devnet program and needs the keeper keypair configured as described in the [development guide](docs/DEVELOPMENT.md).

The hosted faucet is disabled, so bring a funded devnet wallet. Reference-price updates require the authorized keeper to run separately. See the [development guide](docs/DEVELOPMENT.md) for funding, environment variables, keeper setup, deployment, and checks.

## Explore the implementation

- [Deployed game program](https://explorer.solana.com/address/CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP?cluster=devnet)
- [MagicBlock integration and completed-game proof](docs/INTEGRATION.md)
- [Recorded devnet receipts](docs/DEVNET_EVIDENCE.json)
- [Game program](programs/scratchers/src/lib.rs) · [Frontend transactions](app/lib/game.ts) · [Receipt verification](app/lib/verification.ts)
- [Development guide](docs/DEVELOPMENT.md) · [Design system](brand.md)
