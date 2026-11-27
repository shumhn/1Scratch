import { Connection, PublicKey } from "@solana/web3.js";
import { getProgram } from "../app/lib/program";

const ER = "https://devnet-as.magicblock.app/";
const card = new PublicKey(process.argv[2]);

async function main() {
  const conn = new Connection(ER, "confirmed");
  const info = await conn.getAccountInfo(card);
  if (!info) throw new Error("no card");
  const program: any = getProgram(conn);
  const c = program.coder.accounts.decode("card", info.data);
  console.log("state:", Object.keys(c.state)[0]);
  console.log("tierCount:", c.tierCount);
  console.log("cardPriceUsdc:", c.cardPriceUsdc.toString());
  console.log("tiers:", c.tiers.map((t: any) => `${t.multiplierBps}bps@${t.weightPpm}ppm`).join(" | "));
  console.log("owner:", c.owner.toBase58());
  console.log("bump:", c.bump, "| id:", c.id.toString());
}
main();
