import { auth } from "@/lib/auth";

export async function getCurrentTenantId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.tenantId ?? null;
}

export async function requireTenantId(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("No tenant on session — user is not scoped to a hospital.");
  return tenantId;
}
