// Minimal, dependency-free structured logging. No real APM/error-tracking
// service is wired up here — there's no live Sentry (or similar) DSN in
// this environment to integrate against, and a integration that can never
// actually be exercised isn't real progress (same reasoning as the KMS
// note in COMPLIANCE.md). This is the swap point for one: every call goes
// through logError/logInfo, so plugging in a real service later is a
// one-file change (e.g. call Sentry.captureException(error, { extra: fields })
// inside logError) rather than hunting down every catch block in the app.
//
// Output is one JSON object per line on stdout/stderr, which most hosting
// platforms (including Vercel) already collect into searchable log
// storage without any extra configuration.

type LogFields = Record<string, unknown>;

function serialize(level: "error" | "info", scope: string, message: string, fields?: LogFields): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...fields,
  });
}

export function logError(scope: string, error: unknown, fields?: LogFields): void {
  const errorFields =
    error instanceof Error ? { errorName: error.name, stack: error.stack } : { errorValue: String(error) };
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(serialize("error", scope, message, { ...fields, ...errorFields }));
}

export function logInfo(scope: string, message: string, fields?: LogFields): void {
  console.log(serialize("info", scope, message, fields));
}
