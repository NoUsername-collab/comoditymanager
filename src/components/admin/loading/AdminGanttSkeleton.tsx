export function AdminGanttSkeleton() {
  return (
    <div className="admin-route-skeleton admin-route-skeleton--gantt" aria-busy="true">
      <div className="admin-route-skeleton__toolbar" />
      <div className="admin-route-skeleton__grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="admin-route-skeleton__row" />
        ))}
      </div>
    </div>
  );
}
