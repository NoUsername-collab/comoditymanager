export default function GuestStayLoading() {
  return (
    <div className="guest-app__skeleton space-y-6" aria-busy="true" aria-label="Loading">
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
