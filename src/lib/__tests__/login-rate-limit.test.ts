import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isLoginRateLimited,
  recordFailedLoginAttempt,
  clearLoginAttempts,
  __resetLoginRateLimitForTests,
} from "@/lib/loginRateLimit";

// Regression tests: bcrypt.compare previously ran on every login attempt
// with no cap, so credential stuffing was only as slow as bcrypt's cost
// factor made each guess. This proves the limiter actually kicks in after
// repeated failures, resets on success, is scoped per-account (doesn't
// collaterally block other users), and expires after its window.

beforeEach(() => {
  __resetLoginRateLimitForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("login rate limiting", () => {
  it("is not limited before any failed attempts", () => {
    expect(isLoginRateLimited("user@example.com")).toBe(false);
  });

  it("stays unlimited under the threshold", () => {
    for (let i = 0; i < 4; i++) recordFailedLoginAttempt("user@example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(false);
  });

  it("locks out after 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("user@example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(true);
  });

  it("is scoped per email — one account's lockout doesn't affect another", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("attacker-target@example.com");
    expect(isLoginRateLimited("attacker-target@example.com")).toBe(true);
    expect(isLoginRateLimited("someone-else@example.com")).toBe(false);
  });

  it("is case-insensitive on email", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("User@Example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(true);
  });

  it("clears on a successful login", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("user@example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(true);
    clearLoginAttempts("user@example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(false);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("user@example.com");
    expect(isLoginRateLimited("user@example.com")).toBe(true);
    vi.advanceTimersByTime(16 * 60 * 1000); // past the 15-minute window
    expect(isLoginRateLimited("user@example.com")).toBe(false);
  });
});
