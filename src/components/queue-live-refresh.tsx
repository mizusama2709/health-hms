"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 20_000;

/**
 * The queue board is a shared front-desk display — if a second staff
 * member starts or completes a stage, this screen has no way to know
 * without a manual reload. Polls a cheap version signature (count + latest
 * timestamp, not the full board) and surfaces a dismissible banner rather
 * than auto-reloading, since yanking the screen out from under someone
 * mid-click would be worse than a stale view for a few seconds.
 */
export function QueueLiveRefresh({
  appointmentIds,
  initialVersion,
  getVersion,
}: {
  appointmentIds: string[];
  initialVersion: { count: number; latest: number };
  getVersion: (appointmentIds: string[]) => Promise<{ count: number; latest: number }>;
}) {
  const router = useRouter();
  const [stale, setStale] = React.useState(false);
  const baseline = React.useRef(initialVersion);

  // Correct the baseline immediately when a fresh initialVersion arrives
  // (e.g. after the user hits Refresh), then subscribe to polling for the
  // next change — same "sync now, then subscribe" shape as a live clock.
  React.useEffect(() => {
    function resetBaseline() {
      baseline.current = initialVersion;
      setStale(false);
    }
    resetBaseline();

    const id = setInterval(async () => {
      const current = await getVersion(appointmentIds);
      if (current.count !== baseline.current.count || current.latest !== baseline.current.latest) {
        setStale(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [initialVersion, appointmentIds, getVersion]);

  if (!stale) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
      <RefreshCw className="size-4 shrink-0 text-primary" />
      <span>Someone updated the queue — this view may be out of date.</span>
      <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => router.refresh()}>
        Refresh
      </Button>
    </div>
  );
}
