import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the Patients page's actual shape (tab bar, add-patient card,
// filter row, status pills, directory table) so the layout doesn't jump
// once real rows replace this.
export default function PatientsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-32" />

      <div className="flex gap-4 border-b">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>

      <Card className="max-w-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 rounded-full" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
