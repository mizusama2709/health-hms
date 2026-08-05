import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function BillingLoading() {
  return <ListPageSkeleton statTiles={0} withFormCard={true} filterRow={true} rows={4} />;
}
