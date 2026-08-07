import { timingSafeEqual } from "node:crypto";

// Scheduled-job routes have no session — they're called by a cron trigger,
// not a logged-in user — so a shared secret is the only thing stopping
// anyone who can reach the URL from running the job on demand. Vercel Cron
// sends CRON_SECRET as `Authorization: Bearer <secret>` automatically when
// the env var is set on the project; any other scheduler (node-cron, a
// system crontab curl) just needs to send the same header.
export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — an unconfigured secret must never mean "accept anything"
  if (!authHeader) return false;

  const expected = `Bearer ${secret}`;
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(authHeader);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
