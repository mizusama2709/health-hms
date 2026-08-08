import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordFailedLoginAttempt, clearLoginAttempts } from "@/lib/loginRateLimit";

// Regression tests: bcrypt.compare previously ran on every login attempt
// with no cap, so credential stuffing was only as slow as bcrypt's cost
// factor made each guess. This proves the limiter actually kicks in after
// repeated failures, resets on success, is scoped per-account (doesn't
// collaterally block other users), and expires after its window.
//
// Now Postgres-backed (was an in-memory Map — reset on every deploy/
// restart and not shared across multiple server instances). Each test
// uses its own unique email so runs never interfere with each other, and
// `now` is passed explicitly rather than faked, since the database
// wouldn't respect a faked JS clock.

const usedEmails: string[] = [];

afterEach(async () => {
  for (const email of usedEmails.splice(0)) {
    await db.loginAttempt.deleteMany({ where: { email: email.toLowerCase() } });
  }
});

function testEmail(label: string) {
  const email = `rate-limit-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  usedEmails.push(email);
  return email;
}

describe("login rate limiting", () => {
  it("is not limited before any failed attempts", async () => {
    expect(await isLoginRateLimited(testEmail("fresh"))).toBe(false);
  });

  it("stays unlimited under the threshold", async () => {
    const email = testEmail("under-threshold");
    for (let i = 0; i < 4; i++) await recordFailedLoginAttempt(email);
    expect(await isLoginRateLimited(email)).toBe(false);
  });

  it("locks out after 5 failed attempts", async () => {
    const email = testEmail("lockout");
    for (let i = 0; i < 5; i++) await recordFailedLoginAttempt(email);
    expect(await isLoginRateLimited(email)).toBe(true);
  });

  it("is scoped per email — one account's lockout doesn't affect another", async () => {
    const target = testEmail("attacker-target");
    const other = testEmail("someone-else");
    for (let i = 0; i < 5; i++) await recordFailedLoginAttempt(target);
    expect(await isLoginRateLimited(target)).toBe(true);
    expect(await isLoginRateLimited(other)).toBe(false);
  });

  it("is case-insensitive on email", async () => {
    const email = testEmail("case-check");
    for (let i = 0; i < 5; i++) await recordFailedLoginAttempt(email.toUpperCase());
    expect(await isLoginRateLimited(email.toLowerCase())).toBe(true);
  });

  it("clears on a successful login", async () => {
    const email = testEmail("clears-on-success");
    for (let i = 0; i < 5; i++) await recordFailedLoginAttempt(email);
    expect(await isLoginRateLimited(email)).toBe(true);
    await clearLoginAttempts(email);
    expect(await isLoginRateLimited(email)).toBe(false);
  });

  it("resets after the window elapses", async () => {
    const email = testEmail("window-elapses");
    const start = new Date();
    for (let i = 0; i < 5; i++) await recordFailedLoginAttempt(email, start);
    expect(await isLoginRateLimited(email, start)).toBe(true);

    const past16Min = new Date(start.getTime() + 16 * 60 * 1000); // past the 15-minute window
    expect(await isLoginRateLimited(email, past16Min)).toBe(false);
  });
});
