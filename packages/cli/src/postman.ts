import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPostmanCollection, type RouteManifest } from "@zolt-framework/core";

export async function generatePostman(cwd: string): Promise<string> {
  const project = JSON.parse(await readFile(path.join(cwd, "zolt.project.json"), "utf8")) as { template?: string };
  if (project.template !== "api") throw new Error("Postman generation is available for API projects. Set template to api or add an API route manifest.");
  const manifest = JSON.parse(await readFile(path.join(cwd, "routes", "manifest.json"), "utf8")) as RouteManifest;
  const packageJson = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8")) as { name?: string };
  const name = packageJson.name ?? "zolt-api";
  const directory = path.join(cwd, "postman");
  const output = path.join(directory, `${name}.postman_collection.json`);
  await mkdir(directory, { recursive: true });
  await writeFile(output, `${JSON.stringify(createPostmanCollection(name, manifest), null, 2)}\n`, "utf8");
  return output;
}
