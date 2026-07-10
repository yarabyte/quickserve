import { describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows under the limit then blocks", () => {
    resetRateLimits();
    const key = "test-key";
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(false);
  });
});
