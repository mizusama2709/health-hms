import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

// storage.ts is faked here — there's no real S3/R2 bucket configured in this
// environment. Everything else (consent gate, DICOM header parsing, series
// grouping, DB writes) runs against the real dev database; only the actual
// bytes-landing-in-a-bucket step is unverified until real credentials exist.
const uploaded = new Map<string, Buffer>();
vi.mock("@/lib/storage", () => ({
  uploadObject: vi.fn(async (key: string, bytes: Buffer) => {
    uploaded.set(key, bytes);
  }),
  getPresignedGetUrl: vi.fn(async (key: string) => `https://fake-bucket.example/${key}?signed=1`),
}));

const { createImagingOrder, uploadImagingInstances, getImagingInstanceUrl } = await import("@/lib/imaging");
const storage = await import("@/lib/storage");

const sampleDicomPath = path.join(__dirname, "fixtures", "sample-ct.dcm");
const sampleJpgPath = path.join(__dirname, "fixtures", "sample.jpg");
const samplePngPath = path.join(__dirname, "fixtures", "sample.png");
const samplePdfPath = path.join(__dirname, "fixtures", "sample-report.pdf");

let tenantId: string;
let patientId: string;
let staffUserId: string;
const createdOrderIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  tenantId = tenant.id;
  patientId = patient.id;
  staffUserId = doctor.user.id;
});

afterEach(async () => {
  for (const id of createdOrderIds.splice(0)) {
    const order = await db.imagingOrder.findUnique({ where: { id }, include: { studies: { include: { series: { include: { instances: true } } } } } });
    if (order) {
      for (const study of order.studies) {
        for (const series of study.series) {
          await db.imagingInstance.deleteMany({ where: { seriesId: series.id } });
        }
        await db.imagingSeries.deleteMany({ where: { studyId: study.id } });
      }
      await db.imagingStudy.deleteMany({ where: { imagingOrderId: id } });
    }
    await db.imagingOrder.delete({ where: { id } });
  }
  uploaded.clear();
  vi.clearAllMocks();
});

describe("createImagingOrder consent requirement", () => {
  it("requires patientConsentedAt to create an order", async () => {
    // @ts-expect-error — intentionally omitting the required field to prove the type contract
    await expect(createImagingOrder({ tenantId, patientId, orderedById: staffUserId, modality: "XRAY" })).rejects.toThrow();
  });

  it("creates the order when consent is recorded", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);
    expect(order.id).toBeTruthy();
    expect(order.status).toBe("ORDERED");
  });
});

describe("uploadImagingInstances", () => {
  it("parses a real DICOM file's header, groups it into a series, and uploads via the storage adapter", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "CT",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(sampleDicomPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample-ct.dcm", bytes }]);

    expect(study.studyInstanceUid).toBe("1.3.6.1.4.1.5962.1.2.1.20040119072730.12322");
    expect(study.series).toHaveLength(1);
    const series = study.series[0];
    expect(series.seriesInstanceUid).toBe("1.3.6.1.4.1.5962.1.3.1.1.20040119072730.12322");
    expect(series.sliceThickness).toBeCloseTo(5, 3);
    expect(series.pixelSpacingX).toBeCloseTo(0.661468, 5);
    expect(series.instances).toHaveLength(1);
    expect(series.instances[0].sopInstanceUid).toBe("1.3.6.1.4.1.5962.1.1.1.1.1.20040119072730.12322");

    // The real bytes actually reached the (faked) storage adapter, keyed by
    // the same storageKey stored on the ImagingInstance row.
    expect(uploaded.get(series.instances[0].storageKey)).toEqual(bytes);

    const refreshedOrder = await db.imagingOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(refreshedOrder.status).toBe("COMPLETED");
  });

  it("leaves no orphaned ImagingStudy/ImagingSeries rows when the storage upload fails", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "CT",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    vi.mocked(storage.uploadObject).mockRejectedValueOnce(new Error("simulated bucket failure"));

    const bytes = readFileSync(sampleDicomPath);
    await expect(uploadImagingInstances(tenantId, order.id, [{ name: "sample-ct.dcm", bytes }])).rejects.toThrow(
      "simulated bucket failure"
    );

    const refreshedOrder = await db.imagingOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { studies: true },
    });
    expect(refreshedOrder.status).toBe("ORDERED");
    expect(refreshedOrder.studies).toHaveLength(0);
  });

  it("rejects a file that isn't valid DICOM, JPG, PNG, or PDF", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    await expect(
      uploadImagingInstances(tenantId, order.id, [{ name: "not-dicom.txt", bytes: Buffer.from("hello world") }])
    ).rejects.toThrow();
  });

  it("accepts a real JPG file as its own series/instance with no fabricated DICOM metadata", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(sampleJpgPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample.jpg", bytes }]);

    expect(study.series).toHaveLength(1);
    const series = study.series[0];
    expect(series.sliceThickness).toBeNull();
    expect(series.pixelSpacingX).toBeNull();
    expect(series.instances).toHaveLength(1);
    expect(series.instances[0].contentType).toBe("image/jpeg");
    expect(uploaded.get(series.instances[0].storageKey)).toEqual(bytes);
  });

  it("accepts a real PNG file", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(samplePngPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample.png", bytes }]);

    expect(study.series[0].instances[0].contentType).toBe("image/png");
  });

  it("accepts a real PDF report", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "CT",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(samplePdfPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample-report.pdf", bytes }]);

    expect(study.series[0].instances[0].contentType).toBe("application/pdf");
    expect(uploaded.get(study.series[0].instances[0].storageKey)).toEqual(bytes);
  });

  it("keeps each non-DICOM file as its own series even when uploaded together", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const jpgBytes = readFileSync(sampleJpgPath);
    const pngBytes = readFileSync(samplePngPath);
    const study = await uploadImagingInstances(tenantId, order.id, [
      { name: "sample.jpg", bytes: jpgBytes },
      { name: "sample.png", bytes: pngBytes },
    ]);

    expect(study.series).toHaveLength(2);
    const contentTypes = study.series.map((s) => s.instances[0].contentType).sort();
    expect(contentTypes).toEqual(["image/jpeg", "image/png"]);
  });
});

describe("getImagingInstanceUrl", () => {
  it("returns a presigned URL for an instance belonging to the given tenant", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "CT",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(sampleDicomPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample-ct.dcm", bytes }]);
    const instanceId = study.series[0].instances[0].id;

    const url = await getImagingInstanceUrl(tenantId, instanceId);
    expect(url).toContain("signed=1");
  });

  it("refuses to resolve an instance for the wrong tenant", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "CT",
      patientConsentedAt: new Date(),
    });
    createdOrderIds.push(order.id);

    const bytes = readFileSync(sampleDicomPath);
    const study = await uploadImagingInstances(tenantId, order.id, [{ name: "sample-ct.dcm", bytes }]);
    const instanceId = study.series[0].instances[0].id;

    await expect(getImagingInstanceUrl("some-other-tenant-id", instanceId)).rejects.toThrow();
  });
});
