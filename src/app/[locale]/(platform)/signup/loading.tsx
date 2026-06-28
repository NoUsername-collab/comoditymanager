import { PublicFormSkeleton } from "@/components/public/PublicPageSkeleton";

export default function SignupLoading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă...">
      <PublicFormSkeleton />
    </div>
  );
}
