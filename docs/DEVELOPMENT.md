# 1Scratch development guide

[Back to the product overview](../README.md).

## Run the web app

Use Node.js 22 or later. The existing devnet deployment is configured in `app/lib/consts.ts` and `config/devnet.json`; running the frontend does not require deploying the program again.

```sh
npm ci
npm --prefix app ci
cp app/.env.example app/.env.local
npm --prefix app run dev
```

Open `http://localhost:3000/` for the landing page and `http://localhost:3000/play` for the game. Open the game in a browser with Phantom or Solflare, select devnet, and connect a wallet funded with devnet SOL and this app's devnet USDC mint. The header's Funds action is available when the server faucet is configured.

The production frontend can be built and started with:

```sh
npm --prefix app run build
npm --prefix app run start
```

### Environment variables

See `app/.env.example`. `NEXT_PUBLIC_BASE_RPC` is browser-visible; `BASE_RPC` is used by the server faucet. Both default to MagicBlock's Solana devnet RPC.

The optional `FAUCET_KEYPAIR` is a server-only JSON secret key array for the configured devnet USDC mint authority. Supply it through a local ignored environment file or your host's secret store. Leaving it empty disables funding. Production funding is disabled unless `FAUCET_PUBLIC_ENABLED=1`. A public faucet also needs durable rate limits and a funding budget; a per-wallet balance check does not prevent new-wallet requests.

### Host the frontend on Vercel

Import this repository with **Root Directory `app`**, framework **Next.js**, and **Node.js 22.x**. Use `npm ci` to install and `npm run build` to build. The browser and server RPC defaults already point to MagicBlock's Solana devnet RPC; set `NEXT_PUBLIC_BASE_RPC` and `BASE_RPC` only to override them.

Keep `FAUCET_PUBLIC_ENABLED=0` and leave `FAUCET_KEYPAIR` unset for the public deployment. Players need a wallet funded with devnet SOL and the app's devnet USDC. Local environment files and signing material are excluded from CLI uploads by `.vercelignore`.

Vercel hosts the web app and its optional API route. Run the reference-price keeper separately as a persistent process; a frontend deployment does not host the keeper or redeploy the Solana program.

### Keep reference prices fresh

The price keeper signs devnet price updates using the keeper authorized in the `House` account. It requests Jupiter mainnet token quotes, and uses the configured fallback prices if live sources are unavailable. Only the reference-price requests use mainnet; the keeper's transactions are sent to devnet.

Build the program first so the keeper can load `target/idl/scratchers.json`:

```sh
anchor build
KEEPER_KEYPAIR=/absolute/path/to/authorized-keeper.json npm run keeper
```

The repository pins Rust 1.89.0, Anchor Rust crates 1.1.2, and MagicBlock's Rust ER SDK 0.18.0. Use the compatible Anchor CLI 1.1.2 and Solana SBF build tools. Additional keeper settings are documented in `keeper/.env.example`; export them in your shell because the keeper does not load that file automatically. Its default refresh cycle is 30 seconds. Claims and treasury sales reject stale reference prices.

### Set up your own devnet deployment

`npm run setup:devnet` initializes the house, creates devnet prize mints, funds the house vaults and treasury, and funds the setup wallet. It requires the deployment authority and a funded devnet wallet; it writes `config/devnet.json`. After configuring your own deployment, update `app/lib/consts.ts` and the faucet's mint configuration to match. Do not run bootstrap merely to use the existing deployment.

## Checks and transaction evidence

Checks that do not send transactions:

```sh
cargo test -p scratchers --lib
npx tsc --noEmit
npx tsc --noEmit -p app/tsconfig.json
```

For the frontend alone, `cd app && npx tsc --noEmit` runs its type check. `npm --prefix app run build` performs the Next.js production build.

These scripts sign and send devnet transactions using `ANCHOR_WALLET` (default `~/.config/solana/id.json`):

```sh
npm run e2e -- AAPLx
npm run e2e:sell -- AAPLx
```

The sell script sells the wallet's entire balance of the specified devnet prize asset. `npm run test:sell-guard` simulates a sale below the user's minimum output. To inspect a settled card's transaction receipt without signing:

```sh
npx tsx scripts/verify_receipt.ts <owner-address> <card-id> [er-rpc-url]
```

For a completed game and the SDK integration points, see [MagicBlock integration and transaction proof](INTEGRATION.md).

The app's **Verify this card** panel links the Solana buy/claim transactions and the MagicBlock ER scratch/callback/settlement transactions. It recomputes the payout using stored randomness and the saved prize table. This arithmetic check and the accepted callback transaction do not independently verify the oracle's cryptographic proof.

## Deployment and project structure

Program: [`CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP`](https://explorer.solana.com/address/CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP?cluster=devnet)

House: [`6ueXccthuD73jY93851FVTztKBPAyv8UxwTzit9UKNc9`](https://explorer.solana.com/address/6ueXccthuD73jY93851FVTztKBPAyv8UxwTzit9UKNc9?cluster=devnet)

| Directory             | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `programs/scratchers` | Anchor program, VRF callback, payout and treasury sale rules          |
| `app/app`             | Next.js landing page, game route, and optional server faucet          |
| `app/components`      | Wallet controls, stock picker, scratch dialog, portfolio, and receipt |
| `app/lib`             | Client transactions, deployed addresses, IDL, and verification        |
| `keeper`              | Reference-price updates                                               |
| `config`              | Prize registry, table, and public devnet addresses                    |
| `scripts`             | Setup, transaction checks, and card inspection                        |
| `docs/PLAN.md`        | Architecture and development verification notes                       |

Only the card is delegated. The house, inventory, pricing accounts, and token settlement remain on Solana. The internal program name stays `scratchers` to match the deployed program and IDL; the application brand is **1Scratch**.
