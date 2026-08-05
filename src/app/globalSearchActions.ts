"use server";

import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { globalSearchPatients, globalSearchStaff, type GlobalSearchResult } from "@/lib/globalSearch";

/**
 * Backs the ⌘K command palette. People-search (patients/staff) is
 * withheld for doctors — there's no doctor-facing patient-chart route to
 * link a result to, and staff management is an admin-only surface
 * elsewhere in the app — so doctors get page-navigation search only
 * (handled client-side against their own nav tree).
 */
export async function globalSearchAction(query: string): Promise<{ patients: GlobalSearchResult[]; staff: GlobalSearchResult[] }> {
  const session = await auth();
  const tenantId = await requireTenantId();
  const role = session?.user?.role;

  if (role === "DOCTOR") {
    return { patients: [], staff: [] };
  }

  const [patients, staff] = await Promise.all([globalSearchPatients(tenantId, query), globalSearchStaff(tenantId, query)]);

  return { patients, staff };
}
