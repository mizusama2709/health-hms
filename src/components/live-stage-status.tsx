"use client";

import { useEffect, useState } from "react";

function formatElapsed(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * The queue page is pitched as a live front-desk board, but its elapsed-time
 * counters were computed once at request time and froze until someone
 * manually reloaded — including the overdue/red highlight, which is the
 * whole point of the board. This ticks every second on the client, seeded
 * from the server-rendered value (initialElapsedMs) so the very first paint
 * matches the SSR output exactly and there's no hydration mismatch.
 */
export function LiveStageStatus({
  startedAtIso,
  initialElapsedMs,
  turnaroundMinutes,
  assignedToName,
}: {
  startedAtIso: string;
  initialElapsedMs: number;
  turnaroundMinutes: number;
  assignedToName: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);

  useEffect(() => {
    const startedAt = new Date(startedAtIso).getTime();
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick(); // correct immediately for however much time passed between SSR and mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso]);

  const overdue = elapsedMs > turnaroundMinutes * 60000;

  return (
    <div className={overdue ? "text-destructive font-medium" : ""}>
      {assignedToName} · {formatElapsed(elapsedMs)}
    </div>
  );
}
