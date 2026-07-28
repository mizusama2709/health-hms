import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN_RECEPTION: "/admin",
  SUPER_ADMIN: "/admin",
};

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;

  redirect(role ? (ROLE_HOME[role] ?? "/login") : "/login");
}
