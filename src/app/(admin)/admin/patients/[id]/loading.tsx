import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function PatientChartLoading() {
  return <ListPageSkeleton statTiles={0} withFormCard rows={10} />;
}
