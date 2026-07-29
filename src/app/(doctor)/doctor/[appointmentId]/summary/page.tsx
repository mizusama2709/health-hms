import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePreConsultSummary } from "@/lib/copilot";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function CoPilotSummaryPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth();
  const tenantId = session!.user.tenantId!;
  const { appointmentId } = await params;

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: { patient: { include: { user: true } } },
  });

  if (!appointment) notFound();

  let summary: string | null = null;
  let error: string | null = null;
  try {
    summary = await generatePreConsultSummary(appointmentId, tenantId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to generate summary.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/doctor" className="text-sm font-medium text-primary hover:underline">
          ← Back to schedule
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Co-Pilot summary</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.patient.user.name} — {new Date(appointment.datetime).toLocaleString()}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Pre-consultation brief</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{summary}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
