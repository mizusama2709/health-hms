import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function requireRole(...allowed: Role[]) {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  if (!role || !allowed.includes(role)) {
    throw new Error("Not authorized");
  }
  return session!;
}
