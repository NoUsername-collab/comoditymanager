import { AdminCorner } from "@/components/public/AdminCorner";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-themed flex min-h-full flex-1 flex-col">
      <AdminCorner />
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
