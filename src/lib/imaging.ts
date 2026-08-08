import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { uploadObject, getPresignedGetUrl, deleteObject } from "@/lib/storage";
import { detectContentType } from "@/lib/imagingFormat";
import { encryptPHI, decryptPHIMaybe } from "@/lib/phiCrypto";
import * as dicomParser from "dicom-parser";
import type { ImagingModality, ImagingOrderStatus } from "@prisma/client";

export async function createImagingOrder(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  orderedById: string;
  modality: ImagingModality;
  description?: string;
  patientConsentedAt: Date;
}) {
  return db.imagingOrder.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      orderedById: params.orderedById,
      modality: params.modality,
      description: params.description ? encryptPHI(params.description) : params.description,
      patientConsentedAt: params.patientConsentedAt,
    },
  });
}

export async function cancelImagingOrder(tenantId: string, imagingOrderId: string) {
  const order = await db.imagingOrder.findFirstOrThrow({ where: { id: imagingOrderId, tenantId } });
  if (order.status === "CANCELLED") throw new Error("This order is already cancelled");
  return db.imagingOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
}

export async function listImagingOrders(tenantId: string, filters?: { patientId?: string; status?: ImagingOrderStatus }) {
  const orders = await db.imagingOrder.findMany({
    where: {
      tenantId,
      ...(filters?.patientId && { patientId: filters.patientId }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      patient: { include: { user: true } },
      studies: { include: { series: { include: { instances: true } } } },
    },
    orderBy: { orderedAt: "desc" },
  });

  for (const order of orders) {
    order.description = decryptPHIMaybe(order.description);
  }

  return orders;
}

type ParsedFileHeader = {
  contentType: string;
  sopInstanceUid: string;
  seriesInstanceUid: string;
  studyInstanceUid: string;
  seriesNumber: number | undefined;
  instanceNumber: number;
  pixelSpacing: string | undefined;
  sliceThickness: string | undefined;
  imageOrientationPatient: string | undefined;
};

function parseDicomHeader(bytes: Buffer): Omit<ParsedFileHeader, "contentType"> {
  const byteArray = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let dataSet;
  try {
    dataSet = dicomParser.parseDicom(byteArray);
  } catch {
    throw new Error("Not a valid DICOM file, JPG, PNG, or PDF");
  }
  const sopInstanceUid = dataSet.string("x00080018");
  const seriesInstanceUid = dataSet.string("x0020000e");
  const studyInstanceUid = dataSet.string("x0020000d");
  if (!sopInstanceUid || !seriesInstanceUid || !studyInstanceUid) {
    throw new Error("Not a valid DICOM file — missing SOPInstanceUID/SeriesInstanceUID/StudyInstanceUID");
  }
  return {
    sopInstanceUid,
    seriesInstanceUid,
    studyInstanceUid,
    seriesNumber: dataSet.intString("x00200011"),
    instanceNumber: dataSet.intString("x00200013") ?? 1,
    pixelSpacing: dataSet.string("x00280030"),
    sliceThickness: dataSet.string("x00180050"),
    imageOrientationPatient: dataSet.string("x00200037"),
  };
}

// JPG/PNG/PDF carry no DICOM series/spatial metadata — each uploaded file
// becomes its own series and instance rather than fabricating spacing or
// grouping data that doesn't exist, so the viewer only ever shows what's
// actually true about the file.
function parseFileHeader(bytes: Buffer): ParsedFileHeader {
  const contentType = detectContentType(bytes);
  if (contentType === "application/dicom") {
    return { contentType, ...parseDicomHeader(bytes) };
  }
  const id = randomUUID();
  return {
    contentType,
    sopInstanceUid: id,
    seriesInstanceUid: id,
    studyInstanceUid: id,
    seriesNumber: undefined,
    instanceNumber: 1,
    pixelSpacing: undefined,
    sliceThickness: undefined,
    imageOrientationPatient: undefined,
  };
}

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/dicom": "dcm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

// Groups uploaded files into series by SeriesInstanceUID (a single study can
// span multiple series — e.g. pre/post-contrast CT phases), creating an
// ImagingStudy on first upload and reusing it for subsequent uploads to the
// same order, matching how a real scan's files arrive in one or more batches.
export async function uploadImagingInstances(tenantId: string, imagingOrderId: string, files: { name: string; bytes: Buffer }[]) {
  const order = await db.imagingOrder.findFirstOrThrow({
    where: { id: imagingOrderId, tenantId },
    include: { studies: { include: { series: true } } },
  });

  let study = order.studies[0];

  for (const file of files) {
    const header = parseFileHeader(file.bytes);

    // Upload before touching the DB at all, keyed by the series/SOP UID
    // (known from the header, independent of any row existing yet) — so a
    // failed upload (missing bucket config, a network blip) never leaves an
    // orphaned ImagingStudy/ImagingSeries with zero instances behind.
    const extension = EXTENSION_BY_CONTENT_TYPE[header.contentType] ?? "bin";
    const storageKey = `imaging/${tenantId}/${header.seriesInstanceUid}/${header.sopInstanceUid}.${extension}`;
    await uploadObject(storageKey, file.bytes, header.contentType);

    await db.$transaction(async (tx) => {
      if (!study) {
        study = await tx.imagingStudy.create({
          data: {
            imagingOrderId: order.id,
            studyInstanceUid: header.studyInstanceUid,
            uploadedById: order.orderedById,
          },
          include: { series: true },
        });
      }

      let series = study.series.find((s) => s.seriesInstanceUid === header.seriesInstanceUid);
      if (!series) {
        // Number("") is 0, not NaN — guard on the raw string being non-empty
        // first so a missing PixelSpacing tag (or a non-DICOM file, which
        // never has one) stores as null rather than a fabricated 0.
        const [pixelSpacingX, pixelSpacingY] = header.pixelSpacing ? header.pixelSpacing.split("\\").map(Number) : [];
        series = await tx.imagingSeries.create({
          data: {
            studyId: study.id,
            seriesInstanceUid: header.seriesInstanceUid,
            seriesNumber: header.seriesNumber,
            sliceThickness: header.sliceThickness ? Number(header.sliceThickness) : undefined,
            pixelSpacingX: Number.isFinite(pixelSpacingX) ? pixelSpacingX : undefined,
            pixelSpacingY: Number.isFinite(pixelSpacingY) ? pixelSpacingY : undefined,
            imageOrientationPatient: header.imageOrientationPatient,
          },
        });
        study.series.push(series);
      }

      await tx.imagingInstance.create({
        data: {
          seriesId: series.id,
          sopInstanceUid: header.sopInstanceUid,
          instanceNumber: header.instanceNumber,
          contentType: header.contentType,
          storageKey,
          fileSize: file.bytes.byteLength,
        },
      });
    });
  }

  await db.imagingOrder.update({ where: { id: order.id }, data: { status: "COMPLETED" } });

  return db.imagingStudy.findUniqueOrThrow({
    where: { id: study.id },
    include: { series: { include: { instances: true } } },
  });
}

export async function getImagingStudy(tenantId: string, studyId: string) {
  const study = await db.imagingStudy.findFirst({
    where: { id: studyId, imagingOrder: { tenantId } },
    include: {
      imagingOrder: { include: { patient: { include: { user: true } } } },
      series: { include: { instances: true } },
    },
  });
  if (study) study.imagingOrder.description = decryptPHIMaybe(study.imagingOrder.description);
  return study;
}

export async function getImagingInstanceUrl(tenantId: string, instanceId: string) {
  const instance = await db.imagingInstance.findFirstOrThrow({
    where: { id: instanceId, series: { study: { imagingOrder: { tenantId } } } },
  });
  return getPresignedGetUrl(instance.storageKey);
}

// Removes an entire mistakenly-uploaded series (e.g. the wrong file, or a
// botched multi-slice batch) rather than individual instances — for a
// non-DICOM file a series is exactly one file, so this is "delete this
// file"; for DICOM, deleting one slice out of a series wouldn't leave
// anything coherent to view anyway, so the series is the right unit here.
export async function deleteImagingSeries(tenantId: string, seriesId: string) {
  const series = await db.imagingSeries.findFirstOrThrow({
    where: { id: seriesId, study: { imagingOrder: { tenantId } } },
    include: { instances: true, study: true },
  });

  // Best-effort object deletion — a delete failure (no bucket configured,
  // a network blip) shouldn't block removing the DB records; the object
  // is orphaned in that case, not left half-referenced by a row that no
  // longer resolves to anything.
  for (const instance of series.instances) {
    await deleteObject(instance.storageKey).catch(() => {});
  }

  const imagingOrderId = series.study.imagingOrderId;

  await db.$transaction(async (tx) => {
    await tx.imagingInstance.deleteMany({ where: { seriesId: series.id } });
    await tx.imagingSeries.delete({ where: { id: series.id } });

    const remainingSeriesInStudy = await tx.imagingSeries.count({ where: { studyId: series.study.id } });
    if (remainingSeriesInStudy === 0) {
      await tx.imagingStudy.delete({ where: { id: series.study.id } });
    }

    const remainingInstancesInOrder = await tx.imagingInstance.count({
      where: { series: { study: { imagingOrderId } } },
    });
    if (remainingInstancesInOrder === 0) {
      await tx.imagingOrder.update({ where: { id: imagingOrderId }, data: { status: "ORDERED" } });
    }
  });
}
