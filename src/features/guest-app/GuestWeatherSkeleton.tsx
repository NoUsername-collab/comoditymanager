type Props = {
  ariaLabel?: string;
};

export function GuestWeatherSkeleton({ ariaLabel = "…" }: Props) {
  return (
    <section className="guest-weather" aria-busy="true" aria-label={ariaLabel}>
      <div className="guest-app__skeleton-bar guest-app__skeleton-bar--title mb-3" />
      <div className="guest-app__skeleton-card guest-app__skeleton-card--wifi" />
    </section>
  );
}
