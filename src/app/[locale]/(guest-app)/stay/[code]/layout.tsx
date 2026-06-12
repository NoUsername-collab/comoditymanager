import { GuestAccessGate } from "@/features/guest-app/GuestAccessGate";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getPensionSettings } from "@/services/pension-settings";
import type { GuestAccessResult } from "@/domain/guest-app/types";

async function resolveGuestSession(code: string): Promise<GuestAccessResult> {
  try {
    return await resolveGuestAccessByCode(code);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nu puteți accesa această pagină.";
    if (message.includes("auth.tenant_host_required")) {
      return { ok: false, reason: "wrong_host" };
    }
    throw error;
  }
}

export default async function GuestStayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const [{ code }, pensionSettings] = await Promise.all([
    params,
    getPensionSettings().catch(() => null),
  ]);

  const pensionName = pensionSettings?.display_name ?? "Cazare";

  let session: GuestAccessResult;
  try {
    session = await resolveGuestSession(code);
  } catch {
    return (
      <GuestAccessGate
        pensionName={pensionName}
        reason="not_found"
        message="Serviciul nu este disponibil momentan. Reîncercați mai târziu."
      />
    );
  }

  if (!session.ok) {
    return (
      <GuestAccessGate
        pensionName={pensionName}
        reason={session.reason}
        schedule={session.schedule}
      />
    );
  }

  return (
    <GuestAppShell
      appearance={session.settings.appearance}
      pensionName={pensionName}
    >
      {children}
    </GuestAppShell>
  );
}
