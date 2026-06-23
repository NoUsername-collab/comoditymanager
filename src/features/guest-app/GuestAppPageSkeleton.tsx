type Props = {
  label: string;
  variant?: "home" | "feature";
};

export function GuestAppPageSkeleton({ label, variant = "home" }: Props) {
  if (variant === "feature") {
    return (
      <div className="guest-app__skeleton space-y-4" aria-busy="true" aria-label={label}>
        <div className="guest-app__skeleton-bar guest-app__skeleton-bar--title" />
        <div className="guest-app__skeleton-card guest-app__skeleton-card--hero" />
        <div className="guest-app__skeleton-row" />
        <div className="guest-app__skeleton-row" />
      </div>
    );
  }

  return (
    <div className="guest-app__skeleton space-y-6" aria-busy="true" aria-label={label}>
      <div className="guest-app__skeleton-bar guest-app__skeleton-bar--milestones" />
      <div className="guest-app__skeleton-card guest-app__skeleton-card--hero" />
      <div className="guest-app__skeleton-card guest-app__skeleton-card--wifi" />
      <div className="space-y-2">
        <div className="guest-app__skeleton-bar guest-app__skeleton-bar--title" />
        <div className="guest-app__skeleton-row" />
        <div className="guest-app__skeleton-row" />
        <div className="guest-app__skeleton-row" />
      </div>
    </div>
  );
}
