import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("home page", () => {
  it("contains the Zolt welcome content", async () => {
    const source = await readFile(new URL("../app/pages/HomePage.tsx", import.meta.url), "utf8");
    expect(source).toContain("Secure by default");
  });
});
