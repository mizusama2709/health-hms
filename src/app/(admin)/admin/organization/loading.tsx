import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function OrganizationLoading() {
  return <ListPageSkeleton statTiles={0} withFormCard={false} filterRow={false} rows={4} />;
}
