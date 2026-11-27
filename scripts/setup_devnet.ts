/**
 * Devnet bootstrap for Stock Scratchers.
 *
 *   1. Creates a mock USDC mint (6 dp) — or reuses the recorded one
 *   2. initialize_house (prize table from config/assets.json) — idempotent
 *   3. For each prize asset: mock mint → add_asset → fund the house vault
 *      (~$50k inventory per asset, sized off the fallback price)
 *   4. Mints 1,000 mock USDC to the deployer for test buys
 *   5. Writes everything to config/devnet.json
 *
 * Run:  npx tsx scripts/setup_devnet.ts
 * Env:  RPC_URL (default https://rpc.magicblock.app/devnet)
 *       ANCHOR_WALLET (default ~/.config/solana/id.json)
 */
import * as anchor from "@coral-xyz/anchor";
import { BN, Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const RPC_URL = process.env.RPC_URL ?? "https://rpc.magicblock.app/devnet";
const WALLET_PATH =
  process.env.ANCHOR_WALLET ?? join(homedir(), ".config", "solana", "id.json");

const PROGRAM_ID = new PublicKey("CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP");

const assetsCfg = JSON.parse(
  readFileSync(join(ROOT, "config", "assets.json"), "utf8")
);
const devnetPath = join(ROOT, "config", "devnet.json");
const devnet: any = existsSync(devnetPath)
  ? JSON.parse(readFileSync(devnetPath, "utf8"))
  : {};

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8")))
  );
}
const save = () => writeFileSync(devnetPath, JSON.stringify(devnet, null, 2));

async function main() {
  const payer = loadKeypair(WALLET_PATH);
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    readFileSync(join(ROOT, "target", "idl", "scratchers.json"), "utf8")
  ) as Idl;
  const program = new Program(idl, provider);

  console.log("RPC:", RPC_URL);
  console.log("Deployer:", payer.publicKey.toBase58());
  const bal = await connection.getBalance(payer.publicKey);
  console.log("Balance:", (bal / LAMPORTS_PER_SOL).toFixed(3), "SOL");
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error("Low SOL — airdrop first: solana airdrop 2 --url devnet");
  }

  // ---- 1. Mock USDC ------------------------------------------------------
  if (!devnet.usdcMint) {
    console.log("\nCreating mock USDC mint…");
    const mint = await createMint(connection, payer, payer.publicKey, null, 6);
    devnet.usdcMint = mint.toBase58();
    save();
    console.log("  USDC:", devnet.usdcMint);
  }
  const usdcMint = new PublicKey(devnet.usdcMint);

  // ---- 2. House ----------------------------------------------------------
  const [housePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("house")],
    PROGRAM_ID
  );
  devnet.house = housePda.toBase58();

  const existingHouse = await connection.getAccountInfo(housePda);
  if (!existingHouse) {
    console.log("\nInitializing house…");
    const tiers = assetsCfg.prize_table.map((t: any) => ({
      multiplierBps: t.multiplier_bps,
      weightPpm: t.weight_ppm,
    }));
    const cardPrice = new BN(Math.round(assetsCfg.card_price_usdc * 1e6));
    await program.methods
      .initializeHouse(payer.publicKey, cardPrice, tiers, new BN(3600))
      .accounts({ authority: payer.publicKey, usdcMint })
      .rpc();
    console.log("  House initialized:", housePda.toBase58());
  } else {
    console.log("\nHouse exists, skipping init.");
  }
  const usdcTreasury = getAssociatedTokenAddressSync(usdcMint, housePda, true);
  devnet.usdcTreasury = usdcTreasury.toBase58();
  save();

  // The mock dealer needs USDC inventory to buy prize tokens back. Funding is
  // idempotent and only uses the devnet mint authority; it creates no real USD.
  const reserveTarget = BigInt(process.env.DEVNET_SELL_RESERVE_USDC ?? "100000") * 10n ** 6n;
  const treasuryBalance = (await getAccount(connection, usdcTreasury)).amount;
  if (treasuryBalance < reserveTarget) {
    await mintTo(connection, payer, usdcMint, usdcTreasury, payer, reserveTarget - treasuryBalance);
    console.log(`  Funded mock sell reserve to ${reserveTarget / 10n ** 6n} USDC`);
  }

  // ---- 3. Assets ---------------------------------------------------------
  devnet.assets = devnet.assets ?? {};
  for (const a of assetsCfg.assets) {
    const rec = (devnet.assets[a.symbol] = devnet.assets[a.symbol] ?? {});

    if (!rec.mint) {
      console.log(`\nCreating mock ${a.symbol} mint (${a.decimals} dp)…`);
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        a.decimals
      );
      rec.mint = mint.toBase58();
      save();
    }
    const mint = new PublicKey(rec.mint);

    const [assetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("asset"), mint.toBuffer()],
      PROGRAM_ID
    );
    rec.assetPda = assetPda.toBase58();

    if (!(await connection.getAccountInfo(assetPda))) {
      console.log(`  add_asset ${a.symbol}…`);
      const sym = Buffer.alloc(8);
      sym.write(a.symbol.slice(0, 8));
      await program.methods
        .addAsset(Array.from(sym) as any, { [a.kind]: {} } as any)
        .accounts({ authority: payer.publicKey, mint })
        .rpc();
    }

    const vault = getAssociatedTokenAddressSync(mint, housePda, true);
    rec.vault = vault.toBase58();

    if (!rec.funded) {
      // ~$50k inventory, sized off the fallback price.
      const tokens = Math.ceil(50_000 / a.fallback_price_usd);
      const raw = BigInt(tokens) * 10n ** BigInt(a.decimals);
      console.log(
        `  Funding vault with ${tokens.toLocaleString()} ${a.symbol}…`
      );
      await mintTo(connection, payer, mint, vault, payer, raw);
      rec.funded = true;
    }
    save();
  }

  // ---- 4. Test USDC for the deployer -------------------------------------
  const playerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    payer.publicKey
  );
  if (!devnet.playerFunded) {
    await mintTo(
      connection,
      payer,
      usdcMint,
      playerAta.address,
      payer,
      1_000n * 10n ** 6n
    );
    devnet.playerFunded = true;
    save();
    console.log("\nMinted 1,000 mock USDC to deployer.");
  }

  console.log("\n✅ Setup complete — see config/devnet.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
