#!/usr/bin/env node
import { runCli } from "../run.js";

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nZolt Error\n\n${message}\n`);
  process.exitCode = 1;
});
