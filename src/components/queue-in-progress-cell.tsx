"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveStageStatus } from "@/components/live-stage-status";

/**
 * The queue's "Complete" click used to just submit a form and wait for the
 * page to re-render on revalidation — on a shared front-desk display doing
 * this dozens of times a day, that round-trip is felt. Clicking now flips
 * this cell to a "Completing…" checkmark immediately; if the server call
 * fails, it reverts and surfaces a toast instead of silently drifting from
 * what the page actually shows.
 */
export function QueueInProgressCell({
  entryId,
  startedAtIso,
  initialElapsedMs,
  turnaroundMinutes,
  assignedToName,
  vitalsHref,
  completeAction,
}: {
  entryId: string;
  startedAtIso: string;
  initialElapsedMs: number;
  turnaroundMinutes: number;
  assignedToName: string;
  vitalsHref?: string;
  completeAction: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [optimisticallyDone, setOptimisticallyDone] = React.useState(false);

  if (optimisticallyDone) {
    return (
      <span className="flex items-center gap-1 text-emerald-500">
        <CheckCircle2 className="size-3.5" /> Completing…
      </span>
    );
  }

  return (
    <>
      <LiveStageStatus
        startedAtIso={startedAtIso}
        initialElapsedMs={initialElapsedMs}
        turnaroundMinutes={turnaroundMinutes}
        assignedToName={assignedToName}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-1"
        disabled={isPending}
        onClick={() => {
          setOptimisticallyDone(true);
          startTransition(async () => {
            try {
              const formData = new FormData();
              formData.set("entryId", entryId);
              await completeAction(formData);
            } catch {
              setOptimisticallyDone(false);
              toast.error("Couldn't complete this stage — try again");
            }
          });
        }}
      >
        Complete
      </Button>
      {vitalsHref && (
        <Link href={vitalsHref} className="mt-1 block text-primary hover:underline">
          Record vitals →
        </Link>
      )}
    </>
  );
}
