import { db } from "@/lib/db";
import { patientDisplayId } from "@/lib/patients";

export type GlobalSearchResult = { id: string; label: string; sublabel?: string; href: string };

export async function globalSearchPatients(tenantId: string, query: string, limit = 5): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const patients = await db.patient.findMany({
    where: {
      tenantId,
      OR: [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { id: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
    take: limit,
  });

  return patients.map((p) => ({
    id: p.id,
    label: p.user.name,
    sublabel: `${patientDisplayId(p.id)}${p.user.phone ? ` · ${p.user.phone}` : ""}`,
    href: `/admin/patients/${p.id}`,
  }));
}

export async function globalSearchStaff(tenantId: string, query: string, limit = 5): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const staff = await db.user.findMany({
    where: {
      tenantId,
      role: { notIn: ["PATIENT"] },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return staff.map((u) => ({
    id: u.id,
    label: u.name,
    sublabel: `${u.role.replace(/_/g, " ")} · ${u.email}`,
    href: "/admin/staff",
  }));
}
