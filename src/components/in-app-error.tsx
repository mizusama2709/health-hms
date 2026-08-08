"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { logError } from "@/lib/logger";

/**
 * Rendered by each role segment's error.tsx so an unhandled error inside the
 * app lands the user back inside their own sidebar shell — with a way to
 * retry or bail out — instead of Next's bare default error page.
 */
export function InAppError({
  error,
  reset,
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
}) {
  useEffect(() => {
    logError("client-error-boundary", error, { digest: error.digest, homeHref });
  }, [error, homeHref]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <h1 className="text-2xl font-semibold">This page hit an error</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Try again, or head back to your dashboard. If this keeps happening, let your admin know.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link href={homeHref} className={buttonVariants()}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
