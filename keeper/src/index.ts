/**
 * Stock Scratchers — price keeper.
 *
 * Every CYCLE_MS, for every prize asset:
 *   1. Try a live MAINNET Jupiter quote (1 token -> USDC, lite-api = no key)
 *      — xStock mocks priced off their real mainnet mints, crypto off
 *      canonical mints. (unwindfi-proven pattern; 1 quote/sec + retries,
 *      because the public endpoint rate-limits.)
 *   2. Fall back to config fallback_price_usd so the demo never breaks.
 *   3. Push set_price(price_usd_e8) to the Asset PDA on devnet.
 *
 * Env:  RPC_URL        (devnet RPC that submits set_price txs)
 *       KEEPER_KEYPAIR (default ~/.config/solana/id.json — must be the house keeper)
 *       CYCLE_MS       (default 30000)
 */
import { BN, Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const RPC_URL = process.env.RPC_URL ?? "https://rpc.magicblock.app/devnet";
const KEYPAIR_PATH =
  process.env.KEEPER_KEYPAIR ?? join(homedir(), ".config", "solana", "id.json");
const CYCLE_MS = Number(process.env.CYCLE_MS ?? 30_000);

const JUPITER = "https://lite-api.jup.ag";
const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // 6 dp
const QUOTE_SPACING_MS = 1_000; // public-endpoint rate limit (unwindfi lesson)
const MAX_ATTEMPTS = 4;

const PROGRAM_ID = new PublicKey("CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP");

const assetsCfg = JSON.parse(
  readFileSync(join(ROOT, "config", "assets.json"), "utf8")
);
const devnet = JSON.parse(
  readFileSync(join(ROOT, "config", "devnet.json"), "utf8")
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAINNET_RPC =
  process.env.MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Reference-mint decimals are read on-chain (xStocks are 8dp, not 9 — a
// config guess here silently 10x-es every price). Cached per process.
const decimalsCache = new Map<string, number>();
async function refDecimals(mint: string, fallback: number): Promise<number> {
  const hit = decimalsCache.get(mint);
  if (hit != null) return hit;
  try {
    const resp = await fetch(MAINNET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [mint, { encoding: "jsonParsed" }],
      }),
    });
    const body: any = await resp.json();
    const d = body?.result?.value?.data?.parsed?.info?.decimals;
    if (typeof d === "number") {
      decimalsCache.set(mint, d);
      return d;
    }
  } catch {}
  return fallback;
}

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8")))
  );
}

interface QuoteResult {
  priceUsd: number;
  source: "jupiter" | "fallback";
}

async function jupiterPriceUsd(mint: string, decimals: number): Promise<number | null> {
  const amount = (10n ** BigInt(decimals)).toString(); // exactly 1 token
  let delay = 5_000;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const url = `${JUPITER}/swap/v1/quote?inputMint=${mint}&outputMint=${USDC_MAINNET}&amount=${amount}&slippageBps=100`;
    try {
      const resp = await fetch(url);
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(delay);
          delay *= 2;
          continue;
        }
        return null;
      }
      const body: any = await resp.json();
      if (resp.status === 400) {
        if (body?.errorCode === "NO_ROUTES_FOUND") return null; // thin market — fallback
        return null;
      }
      if (!resp.ok || !body?.outAmount) return null;
      return Number(body.outAmount) / 1e6; // USDC per 1 token
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      return null;
    }
  }
  return null;
}

async function main() {
  const keeper = loadKeypair(KEYPAIR_PATH);
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(keeper), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    readFileSync(join(ROOT, "target", "idl", "scratchers.json"), "utf8")
  ) as Idl;
  const program = new Program(idl, provider);

  const [housePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("house")],
    PROGRAM_ID
  );

  console.log(`Keeper: ${keeper.publicKey.toBase58()}`);
  console.log(`RPC:    ${RPC_URL}`);
  console.log(`Cycle:  ${CYCLE_MS / 1000}s — ${assetsCfg.assets.length} assets\n`);

  // Prime every asset once on startup so claims work immediately.
  let firstRun = true;

  for (;;) {
    for (const a of assetsCfg.assets) {
      let quote: QuoteResult;
      if (a.reference?.source === "jupiter") {
        const refDec = await refDecimals(a.reference.mint, a.decimals);
        const p = await jupiterPriceUsd(a.reference.mint, refDec);
        quote = p != null ? { priceUsd: p, source: "jupiter" } : { priceUsd: a.fallback_price_usd, source: "fallback" };
        await sleep(QUOTE_SPACING_MS);
      } else {
        quote = { priceUsd: a.fallback_price_usd, source: "fallback" };
      }

      const priceE8 = BigInt(Math.round(quote.priceUsd * 1e8));
      const mint = new PublicKey(devnet.assets[a.symbol].mint);
      const [assetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset"), mint.toBuffer()],
        PROGRAM_ID
      );

      // Skip the tx if the on-chain price already matches (saves fees).
      if (!firstRun) {
        const current: any = await (program.account as any).asset.fetch(assetPda);
        if (current.priceUsdE8.toString() === priceE8.toString()) {
          console.log(`${a.symbol.padEnd(6)} $${quote.priceUsd} (${quote.source}) — unchanged, skip`);
          continue;
        }
      }

      try {
        const sig = await program.methods
          .setPrice(new BN(priceE8.toString()))
          .accounts({ keeper: keeper.publicKey, house: housePda, asset: assetPda })
          .rpc();
        console.log(
          `${a.symbol.padEnd(6)} $${quote.priceUsd} (${quote.source}) → set_price ${sig.slice(0, 12)}…`
        );
      } catch (e: any) {
        console.error(`${a.symbol.padEnd(6)} set_price failed: ${e.message?.slice(0, 120)}`);
      }
    }
    firstRun = false;
    if (process.env.ONCE === "1") {
      console.log("— ONCE mode, exiting —");
      return;
    }
    console.log(`— cycle done, sleeping ${CYCLE_MS / 1000}s —`);
    await sleep(CYCLE_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
