import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function LabTemplatesLoading() {
  return <ListPageSkeleton statTiles={0} withFormCard={true} filterRow={false} rows={5} />;
}
