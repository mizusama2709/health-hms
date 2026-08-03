import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import { getImagingInstanceUrl } from "@/lib/imaging";

// Unlike the public lab-report PDF route, this one requires a session — the
// imaging viewer is only ever used inside the logged-in app, never shared
// externally, so it's tenant-scoped auth rather than an unguessable ID alone.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = await params;

  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const url = await getImagingInstanceUrl(tenantId, instanceId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Imaging instance not found" }, { status: 404 });
  }
}
