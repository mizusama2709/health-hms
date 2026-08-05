import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function AdminAppointmentsLoading() {
  return <ListPageSkeleton statTiles={5} withFormCard={false} filterRow={true} rows={8} />;
}
