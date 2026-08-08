import { requireTenantId } from "@/lib/tenant";
import { QUEUE_STAGES, listStageConfigs } from "@/lib/queueStages";
import { updateStageConfigActionResult } from "../actions";
import { BackLink } from "@/components/back-link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import type { QueueStage } from "@prisma/client";

export const metadata = {
  title: "Configure Queue",
};

const STAGE_LABELS: Record<QueueStage, string> = {
  REGISTRATION: "Registration",
  VITALS: "Vitals",
  CONSULTATION: "Consultation",
  LAB: "Lab",
  CONSULTATION_2: "Consultation 2",
  PHARMACY: "Pharmacy",
};

export default async function ConfigureQueueFlowPage() {
  const tenantId = await requireTenantId();
  const stageConfigs = await listStageConfigs(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackLink href="/admin/queue" label="Queue" />
        <h1 className="mt-2 text-2xl font-semibold">Configure flow</h1>
        <p className="text-sm text-muted-foreground">
          Set the turnaround time (in minutes) for each stage — a patient&apos;s stage turns red on the Queue board
          once it&apos;s been running longer than this.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Turnaround times</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateStageConfigActionResult} className="flex flex-col gap-3">
            {QUEUE_STAGES.map((stage) => (
              <div key={stage} className="flex flex-col gap-1">
                <Label htmlFor={`turnaround_${stage}`}>{STAGE_LABELS[stage]} (minutes)</Label>
                <Input
                  id={`turnaround_${stage}`}
                  name={`turnaround_${stage}`}
                  type="number"
                  min={1}
                  defaultValue={stageConfigs[stage]}
                  required
                />
              </div>
            ))}
            <Button type="submit" className="mt-2 self-start">
              Save
            </Button>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
