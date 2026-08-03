import { db } from "@/lib/db";
import { uploadObject, getPresignedGetUrl } from "@/lib/storage";
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
      description: params.description,
      patientConsentedAt: params.patientConsentedAt,
    },
  });
}

export async function listImagingOrders(tenantId: string, filters?: { patientId?: string; status?: ImagingOrderStatus }) {
  return db.imagingOrder.findMany({
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
}

type DicomHeader = {
  sopInstanceUid: string;
  seriesInstanceUid: string;
  studyInstanceUid: string;
  seriesNumber: number | undefined;
  instanceNumber: number;
  pixelSpacing: string | undefined;
  sliceThickness: string | undefined;
  imageOrientationPatient: string | undefined;
};

function parseDicomHeader(bytes: Buffer): DicomHeader {
  const byteArray = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataSet = dicomParser.parseDicom(byteArray);
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
    const header = parseDicomHeader(file.bytes);

    // Upload before touching the DB at all, keyed by the DICOM series/SOP UID
    // (known from the header, independent of any row existing yet) — so a
    // failed upload (missing bucket config, a network blip) never leaves an
    // orphaned ImagingStudy/ImagingSeries with zero instances behind.
    const storageKey = `imaging/${tenantId}/${header.seriesInstanceUid}/${header.sopInstanceUid}.dcm`;
    await uploadObject(storageKey, file.bytes, "application/dicom");

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
        const [pixelSpacingX, pixelSpacingY] = (header.pixelSpacing ?? "").split("\\").map(Number);
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
  return db.imagingStudy.findFirst({
    where: { id: studyId, imagingOrder: { tenantId } },
    include: {
      imagingOrder: { include: { patient: { include: { user: true } } } },
      series: { include: { instances: true } },
    },
  });
}

export async function getImagingInstanceUrl(tenantId: string, instanceId: string) {
  const instance = await db.imagingInstance.findFirstOrThrow({
    where: { id: instanceId, series: { study: { imagingOrder: { tenantId } } } },
  });
  return getPresignedGetUrl(instance.storageKey);
}
