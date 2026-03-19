import { spawn } from "node:child_process";
import { resolve } from "node:path";

const env = { ...process.env };
delete env.__NEXT_PRIVATE_STANDALONE_CONFIG;
delete env.__NEXT_PRIVATE_RENDER_WORKER_CONFIG;
env.NEXT_IGNORE_INCORRECT_LOCKFILE = "1";

const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
