import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let stopping = false;
let keeperRestart;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(keeperRestart);
  for (const child of children) {
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  setTimeout(() => process.exit(code), 250).unref();
}

function run(name, args, cwd, restart) {
  const child = spawn(npm, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  children.add(child);
  child.on("error", (error) => {
    console.error(`${name} could not start: ${error.message}`);
    if (!restart) stop(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    if (stopping) return;
    if (restart) {
      console.error(`${name} stopped (${code ?? "signal"}); restarting in 5 seconds…`);
      keeperRestart = setTimeout(() => run(name, args, cwd, true), 5_000);
    } else {
      console.error(`${name} stopped (${code ?? "signal"}).`);
      stop(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

run("web", ["--prefix", "app", "run", "dev", "--", "-p", "3000"], root, false);
run("keeper", ["run", "keeper"], root, true);
