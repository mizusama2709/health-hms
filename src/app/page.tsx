import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;

  redirect(role ? (ROLE_HOME[role] ?? "/login") : "/login");
}
