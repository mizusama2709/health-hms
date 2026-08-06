import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function DoctorDashboardLoading() {
  return <ListPageSkeleton statTiles={4} withFormCard={false} filterRow={false} rows={6} />;
}
