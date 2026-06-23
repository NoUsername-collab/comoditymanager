export function AdminListSkeleton({
  rows = 6,
  label,
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className="admin-route-skeleton admin-route-skeleton--list"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="admin-route-skeleton__card" />
      ))}
    </div>
  );
}
