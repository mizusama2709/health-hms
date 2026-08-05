import { notFound } from "next/navigation";
import { FileImage } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { getImagingStudy } from "@/lib/imaging";
import { deleteImagingSeriesActionResult } from "@/app/(admin)/admin/imaging/actions";
import { DicomViewer } from "@/components/dicom-viewer";
import { ImageViewer } from "@/components/image-viewer";
import { PdfViewer } from "@/components/pdf-viewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import Link from "next/link";

export const metadata = {
  title: "Imaging Study",
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  "application/dicom": "DICOM",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "application/pdf": "PDF document",
};

export default async function ImagingStudyPage({ params }: { params: Promise<{ id: string; studyId: string }> }) {
  const { id: patientId, studyId } = await params;
  const tenantId = await requireTenantId();
  const study = await getImagingStudy(tenantId, studyId);
  if (!study) notFound();

  const seriesWithInstances = study.series.filter((s) => s.instances.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/patients/${patientId}`} className="text-sm font-medium text-primary hover:underline">
          ← Back to {study.imagingOrder.patient.user.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {study.imagingOrder.modality} — {study.imagingOrder.patient.user.name}
        </h1>
      </div>

      {seriesWithInstances.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{study.imagingOrder.description ?? "Imaging study"}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={FileImage} message={<>No files uploaded for this study yet.</>} />
          </CardContent>
        </Card>
      ) : (
        seriesWithInstances.map((series) => {
          const contentType = series.instances[0].contentType;
          const label = CONTENT_TYPE_LABEL[contentType] ?? contentType;
          return (
            <Card key={series.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {study.imagingOrder.description ?? "Imaging study"} — {label}
                </CardTitle>
                <ActionForm
                  action={deleteImagingSeriesActionResult}
                  confirmMessage={`Delete this ${label} series permanently? This cannot be undone.`}
                >
                  <input type="hidden" name="seriesId" value={series.id} />
                  <input type="hidden" name="patientId" value={patientId} />
                  <Button type="submit" size="sm" variant="ghost">
                    Delete
                  </Button>
                </ActionForm>
              </CardHeader>
              <CardContent>
                {contentType === "application/dicom" ? (
                  <DicomViewer
                    series={{
                      id: series.id,
                      instances: series.instances.map((i) => ({ id: i.id, instanceNumber: i.instanceNumber })),
                    }}
                  />
                ) : contentType === "application/pdf" ? (
                  <PdfViewer instanceId={series.instances[0].id} />
                ) : (
                  <ImageViewer instanceId={series.instances[0].id} />
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
