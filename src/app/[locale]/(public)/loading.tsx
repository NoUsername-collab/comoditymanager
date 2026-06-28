import { PublicHeroSkeleton, PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";

export default function PublicHomeLoading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă...">
      <PublicHeroSkeleton />
      <PublicCardsSkeleton cards={4} />
    </div>
  );
}
