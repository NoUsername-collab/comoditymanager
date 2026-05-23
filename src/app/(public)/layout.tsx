import { AdminCorner } from "@/components/public/AdminCorner";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { ThemeProvider } from "@/components/public/ThemeProvider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="site-themed flex min-h-full flex-1 flex-col">
        <AdminCorner />
        <PublicHeader />
        {children}
        <PublicFooter />
      </div>
    </ThemeProvider>
  );
}
