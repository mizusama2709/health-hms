import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function QueueLoading() {
  return <ListPageSkeleton statTiles={7} withFormCard={false} filterRow={false} rows={6} />;
}
