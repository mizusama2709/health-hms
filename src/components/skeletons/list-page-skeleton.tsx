import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic shape for the many admin/doctor pages that are "title + optional
 * form card + filter row + table" — covers the mechanical majority of list
 * pages without hand-building a bespoke skeleton for each one. Patients and
 * Reports have their own more exactly-matched skeletons; this is for
 * everything else that shares this same basic shape.
 */
export function ListPageSkeleton({
  statTiles = 0,
  withFormCard = false,
  filterRow = true,
  rows = 6,
}: {
  statTiles?: number;
  withFormCard?: boolean;
  filterRow?: boolean;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />

      {statTiles > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: statTiles }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {withFormCard && (
        <Card className="max-w-xl">
          <CardContent className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          {filterRow && (
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-24" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
