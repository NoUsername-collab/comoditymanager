export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="admin-route-skeleton admin-route-skeleton--list" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="admin-route-skeleton__card" />
      ))}
    </div>
  );
}
