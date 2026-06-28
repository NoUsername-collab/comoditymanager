import { PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";

export default function PreturiLoading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă prețurile...">
      <PublicCardsSkeleton cards={3} />
    </div>
  );
}
