import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { uploadImagingInstances } from "@/lib/imaging";
import { readRequestBodyWithLimit, PayloadTooLargeError } from "@/lib/readRequestBodyWithLimit";

const IMAGING_ROLES = ["LAB", "ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

// Matches the Server Actions bodySizeLimit in next.config.ts — this route
// handler needs its own enforcement since that config doesn't cover it.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// A Route Handler (not a server action) so the client can drive the upload
// via XMLHttpRequest and get real byte-level progress events — server
// actions don't expose upload progress, which matters once a real
// multi-slice series upload can run into the tens of MB.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  try {
    await requireRole(...IMAGING_ROLES);
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const tenantId = await requireTenantId();

  let bodyBuffer: Buffer;
  try {
    bodyBuffer = await readRequestBodyWithLimit(req, MAX_UPLOAD_BYTES);
  } catch (e) {
    if (e instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: e.message }, { status: 413 });
    }
    throw e;
  }

  // formData() needs the multipart boundary from the original Content-Type
  // header, so re-wrap the already-size-checked bytes in a fresh Request
  // rather than trying to call formData() on the (now-drained) original.
  const rebuiltRequest = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: new Uint8Array(bodyBuffer),
  });
  const formData = await rebuiltRequest.formData();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f) => f.size > 0);

  if (realFiles.length === 0) {
    return NextResponse.json({ error: "Choose at least one file to upload" }, { status: 400 });
  }

  try {
    const parsed = await Promise.all(
      realFiles.map(async (file) => ({ name: file.name, bytes: Buffer.from(await file.arrayBuffer()) }))
    );
    await uploadImagingInstances(tenantId, orderId, parsed);
    revalidatePath("/admin/imaging/orders");
    return NextResponse.json({ success: true, fileCount: realFiles.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
