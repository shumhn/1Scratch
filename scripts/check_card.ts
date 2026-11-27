import { Connection, PublicKey } from "@solana/web3.js";
import { fetchCard, cardStateName, formatMultiplier } from "../app/lib/program";

const ER = "https://devnet-as.magicblock.app/";
const card = new PublicKey(process.argv[2]);
const BASE = "https://rpc.magicblock.app/devnet";

async function main() {
  for (const [name, url] of [["ER", ER], ["BASE", BASE]] as const) {
    const conn = new Connection(url, "confirmed");
    const c = await fetchCard(conn, card);
    if (!c) { console.log(name, "→ not found"); continue; }
    console.log(
      name, "→ state:", cardStateName(c),
      "| mult:", formatMultiplier(c.multiplierBps),
      "| prize $", c.prizeUsdE6.toNumber() / 1e6
    );
  }
}
main();
