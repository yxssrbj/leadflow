import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit inside a window, then blocks", () => {
    const key = `t1-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    const key = `t2-${Math.random()}`;
    for (let i = 0; i < 6; i++) rateLimit(key, 5, 60_000);
    expect(rateLimit(key, 5, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimit(key, 5, 60_000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `t3a-${Math.random()}`;
    const b = `t3b-${Math.random()}`;
    for (let i = 0; i < 6; i++) rateLimit(a, 5, 60_000);
    expect(rateLimit(a, 5, 60_000).ok).toBe(false);
    expect(rateLimit(b, 5, 60_000).ok).toBe(true);
  });
});
