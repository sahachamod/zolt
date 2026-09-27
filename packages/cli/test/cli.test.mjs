import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import path from "node:path";

const bin = path.resolve("dist/bin/zolt.js");

test("CLI prints version", () => {
  const result = spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "0.1.0");
});

test("CLI prints help and command list", () => {
  const result = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /doctor\s+Check the local development environment/);
});
