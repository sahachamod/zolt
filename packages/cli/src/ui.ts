const enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code: number, value: string) => enabled ? `\u001b[${code}m${value}\u001b[0m` : value;

export function printBanner(): void {
  const row = (value: string) => `${color(36, "│")} ${value.padEnd(40)} ${color(36, "│")}`;
  console.log([
    color(36, "╭──────────────────────────────────────────╮"),
    row(`◆ ZOLT ${ZOLT_VERSION}`),
    row("Tenant-first TypeScript applications"),
    row("secure · modular · developer-friendly"),
    color(36, "╰──────────────────────────────────────────╯")
  ].join("\n"));
}

import { ZOLT_VERSION } from "./version.js";
