import { readFile } from "node:fs/promises";

const expected = process.argv[2];
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expected ?? "")) throw new Error("A valid semantic version is required.");
for (const filename of ["package.json", "packages/core/package.json", "packages/config/package.json", "packages/security/package.json", "packages/auth/package.json", "packages/database/package.json", "packages/http/package.json", "packages/cli/package.json", "create-zolt/package.json"]) {
  const json = JSON.parse(await readFile(filename, "utf8"));
  if (json.version !== expected) throw new Error(`${filename} has version ${json.version}; expected ${expected}.`);
}
console.log(`All publishable packages use ${expected}.`);
