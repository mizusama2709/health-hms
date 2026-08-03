"use client";

import { InAppError } from "@/components/in-app-error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <InAppError error={error} reset={reset} homeHref="/patient" />;
}
