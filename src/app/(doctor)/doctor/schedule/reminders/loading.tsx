import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function DoctorRemindersLoading() {
  return <ListPageSkeleton statTiles={0} withFormCard={false} filterRow={true} rows={6} />;
}
