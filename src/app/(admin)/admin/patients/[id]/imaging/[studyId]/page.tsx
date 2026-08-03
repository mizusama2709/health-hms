import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getImagingStudy } from "@/lib/imaging";
import { DicomViewer } from "@/components/dicom-viewer";
import { ImageViewer } from "@/components/image-viewer";
import { PdfViewer } from "@/components/pdf-viewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
  const { studyId } = await params;
  const tenantId = await requireTenantId();
  const study = await getImagingStudy(tenantId, studyId);
  if (!study) notFound();

  const seriesWithInstances = study.series.filter((s) => s.instances.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {study.imagingOrder.modality} — {study.imagingOrder.patient.user.name}
      </h1>

      {seriesWithInstances.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{study.imagingOrder.description ?? "Imaging study"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No files uploaded for this study yet.</p>
          </CardContent>
        </Card>
      ) : (
        seriesWithInstances.map((series) => {
          const contentType = series.instances[0].contentType;
          const label = CONTENT_TYPE_LABEL[contentType] ?? contentType;
          return (
            <Card key={series.id}>
              <CardHeader>
                <CardTitle>
                  {study.imagingOrder.description ?? "Imaging study"} — {label}
                </CardTitle>
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
