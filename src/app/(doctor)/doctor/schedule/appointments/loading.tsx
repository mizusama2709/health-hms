import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function DoctorAppointmentsLoading() {
  return <ListPageSkeleton statTiles={5} withFormCard={false} filterRow={true} rows={8} />;
}
