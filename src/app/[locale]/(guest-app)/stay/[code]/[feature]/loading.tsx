export default function GuestFeatureLoading() {
  return (
    <div className="guest-app__skeleton space-y-4" aria-busy="true">
      <div className="guest-app__skeleton-bar guest-app__skeleton-bar--title" />
      <div className="guest-app__skeleton-card guest-app__skeleton-card--hero" />
      <div className="guest-app__skeleton-row" />
      <div className="guest-app__skeleton-row" />
    </div>
  );
}
