import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignored = new Set([".git", "node_modules", "dist", "artifacts", "coverage"]);
const suspiciousNames = [/^\.env$/, /\.pem$/i, /id_rsa$/i, /\.p12$/i, /\.npmrc\.local$/i];
const suspiciousContents = [new RegExp("-----BEGIN (?:RSA |OPENSSH |EC )?" + "PRIVATE KEY-----"), /npm_[A-Za-z0-9]{30,}/, /ghp_[A-Za-z0-9]{30,}/];
const failures = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else {
      if (suspiciousNames.some((pattern) => pattern.test(entry.name))) failures.push(`Sensitive filename: ${filename}`);
      const content = await readFile(filename, "utf8").catch(() => "");
      if (suspiciousContents.some((pattern) => pattern.test(content))) failures.push(`Possible secret: ${filename}`);
    }
  }
}

await scan(process.cwd());
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("No private keys, environment files, or common token patterns found.");
