// In-memory sliding-window limiter on failed login attempts, keyed by
// email. There was previously no limiter at all — bcrypt.compare ran on
// every request with no cap, so credential stuffing/brute force was only as
// slow as bcrypt's cost factor made each guess. This is intentionally
// simple (no Redis/external store): correct for a single Node process, but
// state isn't shared across multiple instances/regions in a multi-instance
// deployment — a production rollout across several instances should also
// add IP-based throttling at the edge/gateway (Vercel WAF, Cloudflare, etc.)
// rather than relying on this alone.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; windowStart: number };

const attemptsByEmail = new Map<string, Entry>();

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function isLoginRateLimited(email: string): boolean {
  const key = normalize(email);
  const entry = attemptsByEmail.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    attemptsByEmail.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedLoginAttempt(email: string): void {
  const key = normalize(email);
  const now = Date.now();
  const entry = attemptsByEmail.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attemptsByEmail.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

export function clearLoginAttempts(email: string): void {
  attemptsByEmail.delete(normalize(email));
}

// Test-only: the map is otherwise process-lifetime, which would leak state
// between test cases.
export function __resetLoginRateLimitForTests(): void {
  attemptsByEmail.clear();
}
