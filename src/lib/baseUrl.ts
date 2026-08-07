import { headers } from "next/headers";

// Only callable from a request-scoped context (Server Action, Route
// Handler) — lib/ functions that need the app's own origin (to build a
// document download link) take it as a plain string param instead of
// calling this themselves, so they stay callable from tests with no
// request context at all.
export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
