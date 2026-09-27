import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs, validateProjectName } from "../dist/index.js";

test("parses deterministic creation options", () => {
  const options = parseArgs(["demo", "--yes", "--template", "minimal", "--no-git"]);
  assert.equal(options.projectArg, "demo");
  assert.equal(options.template, "minimal");
  assert.equal(options.git, false);
});

test("rejects unsafe npm project names", () => {
  assert.throws(() => validateProjectName("Bad Name"), /Invalid project name/);
  assert.doesNotThrow(() => validateProjectName("good-name"));
});

test("all template overlays generate self-contained projects and dot is supported", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "zolt-templates-"));
  const bin = path.resolve("dist/bin/create-zolt.js");
  try {
    for (const template of ["atlas", "api", "ssr", "minimal"]) {
      const result = spawnSync(process.execPath, [bin, template, "--yes", "--template", template, "--no-install", "--no-git"], { cwd: temporary, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      const manifest = JSON.parse(await readFile(path.join(temporary, template, "package.json"), "utf8"));
      assert.equal(manifest.name, template);
      assert.equal(manifest.devDependencies["@zolt/cli"], "^0.1.0");
      assert.equal(manifest.dependencies["@zolt/http"], "^0.1.0");
      if (template === "api") {
        const collection = JSON.parse(await readFile(path.join(temporary, template, "postman", "api.postman_collection.json"), "utf8"));
        assert.match(collection.info.schema, /v2\.1\.0/);
      }
    }
    const dot = path.join(temporary, "dot-app");
    await mkdir(dot);
    const result = spawnSync(process.execPath, [bin, ".", "--yes", "--no-install", "--no-git"], { cwd: dot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(path.join(dot, "package.json"), "utf8"));
    assert.equal(manifest.name, "dot-app");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
