import { PublicHeroSkeleton, PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";

export default function LandingLoading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă...">
      <PublicHeroSkeleton />
      <PublicCardsSkeleton cards={8} />
      <PublicCardsSkeleton cards={3} />
    </div>
  );
}
