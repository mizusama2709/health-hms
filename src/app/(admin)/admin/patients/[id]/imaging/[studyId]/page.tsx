import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getImagingStudy } from "@/lib/imaging";
import { DicomViewer } from "@/components/dicom-viewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Imaging Study",
};

export default async function ImagingStudyPage({ params }: { params: Promise<{ id: string; studyId: string }> }) {
  const { studyId } = await params;
  const tenantId = await requireTenantId();
  const study = await getImagingStudy(tenantId, studyId);
  if (!study) notFound();

  // The primary series is whichever has the most instances — a multi-slice
  // CT/MRI series is the one worth volume-rendering; a single-instance
  // X-ray/ultrasound study only ever has one series anyway.
  const primarySeries = [...study.series].sort((a, b) => b.instances.length - a.instances.length)[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {study.imagingOrder.modality} — {study.imagingOrder.patient.user.name}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{study.imagingOrder.description ?? "Imaging study"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!primarySeries || primarySeries.instances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images uploaded for this study yet.</p>
          ) : (
            <DicomViewer
              series={{
                id: primarySeries.id,
                instances: primarySeries.instances.map((i) => ({ id: i.id, instanceNumber: i.instanceNumber })),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
