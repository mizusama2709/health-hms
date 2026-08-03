import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Rendered by each role segment's not-found.tsx so a stale/bad link inside
 * the app lands the user back inside their own sidebar shell, not on Next's
 * bare default 404 page with no way back in.
 */
export function InAppNotFound({ homeHref }: { homeHref: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist, or the link may be out of date.
      </p>
      <Link href={homeHref} className={buttonVariants({ className: "mt-2" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
