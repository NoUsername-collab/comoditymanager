import { MobileShell } from "@/layout/components/MobileShell";

export default function AlphaGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileShell surface="auth" className="min-h-dvh">
      {children}
    </MobileShell>
  );
}
