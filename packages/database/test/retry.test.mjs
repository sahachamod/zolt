import assert from "node:assert/strict";
import test from "node:test";
import { withConnectionRetry, isTransientConnectionError } from "../dist/retry.js";

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

test("retries a transient connection error and eventually succeeds", async () => {
  let calls = 0;
  const result = await withConnectionRetry(async () => {
    calls++;
    if (calls < 3) throw codedError("ECONNREFUSED");
    return "connected";
  }, { attempts: 5, minDelayMs: 1, maxDelayMs: 2 });
  assert.equal(result, "connected");
  assert.equal(calls, 3);
});

test("gives up after the configured attempt count", async () => {
  let calls = 0;
  await assert.rejects(
    withConnectionRetry(async () => {
      calls++;
      throw codedError("ECONNREFUSED");
    }, { attempts: 3, minDelayMs: 1, maxDelayMs: 2 }),
    /ECONNREFUSED/
  );
  assert.equal(calls, 3);
});

test("does not retry a non-transient error", async () => {
  let calls = 0;
  await assert.rejects(
    withConnectionRetry(async () => {
      calls++;
      throw new Error("syntax error at or near \"SELCT\"");
    }, { attempts: 5, minDelayMs: 1, maxDelayMs: 2 }),
    /syntax error/
  );
  assert.equal(calls, 1);
});

test("isTransientConnectionError only matches known connection-establishment codes", () => {
  assert.equal(isTransientConnectionError(codedError("ECONNREFUSED")), true);
  assert.equal(isTransientConnectionError(codedError("ECONNRESET")), false);
  assert.equal(isTransientConnectionError(new Error("plain error")), false);
  assert.equal(isTransientConnectionError("not an error"), false);
});
