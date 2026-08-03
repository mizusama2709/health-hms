/**
 * Rendered by each role segment's loading.tsx — Next.js wraps the segment's
 * page (and nested pages) in a Suspense boundary that shows this while the
 * server component's data fetch is in flight, instead of a frozen blank
 * screen during navigation.
 */
export function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading…
      </div>
    </div>
  );
}
