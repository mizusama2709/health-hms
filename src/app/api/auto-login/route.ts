import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

// Temporary: auto-signs in as the demo admin so the login screen can be
// skipped for now. Remove this route and point proxy.ts / the root page
// back at "/login" to restore real login.
const AUTO_LOGIN_EMAIL = "admin@demo.com";
const AUTO_LOGIN_PASSWORD = "password123";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/admin";

  try {
    await signIn("credentials", {
      email: AUTO_LOGIN_EMAIL,
      password: AUTO_LOGIN_PASSWORD,
      redirect: false,
    });
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.redirect(new URL(callbackUrl, req.url));
}
