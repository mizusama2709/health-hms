import { db } from "@/lib/db";

// Postgres-backed sliding-window limiter on failed login attempts, keyed
// by email — replaces an in-memory Map that reset on every deploy/restart
// and wasn't shared across multiple server instances. bcrypt.compare
// previously ran on every login attempt with no cap at all, so credential
// stuffing was only as slow as bcrypt's cost factor made each guess.
//
// `now` is a parameter (defaulting to the real clock) rather than read
// internally, so tests can control it directly instead of needing the
// database to respect a faked JS clock.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export async function isLoginRateLimited(email: string, now: Date = new Date()): Promise<boolean> {
  const count = await db.loginAttempt.count({
    where: { email: normalize(email), attemptedAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
  });
  return count >= MAX_ATTEMPTS;
}

export async function recordFailedLoginAttempt(email: string, now: Date = new Date()): Promise<void> {
  await db.loginAttempt.create({ data: { email: normalize(email), attemptedAt: now } });
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await db.loginAttempt.deleteMany({ where: { email: normalize(email) } });
}
