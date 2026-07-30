import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;

  // Temporary: skip the login screen, auto-sign in as the demo admin.
  // Revert to `redirect(role ? ROLE_HOME[role] ?? "/login" : "/login")` to restore real login.
  redirect(role ? (ROLE_HOME[role] ?? "/login") : "/api/auto-login?callbackUrl=/admin");
}
