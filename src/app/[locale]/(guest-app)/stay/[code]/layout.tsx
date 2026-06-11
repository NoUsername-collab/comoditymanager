import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getPensionSettings } from "@/services/pension-settings";

const DENY_MESSAGES: Record<string, string> = {
  disabled: "Aplicația pentru oaspeți nu este activă.",
  not_found: "Cod invalid sau inexistent.",
  revoked: "Accesul a fost revocat.",
  booking_not_confirmed: "Rezervarea nu este confirmată.",
  before_check_in: "Linkul devine activ cu o zi înainte de sosire.",
  after_check_out: "Șederea s-a încheiat — accesul nu mai este disponibil.",
};

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

  const session = await resolveGuestAccessByCode(code);
  const pensionName = pensionSettings?.display_name ?? "Cazare";

  if (!session.ok) {
    return (
      <GuestAppShell appearance={{}} pensionName={pensionName}>
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-100">
            Acces indisponibil
          </h1>
          <p className="mt-2 text-sm text-red-200/90">
            {DENY_MESSAGES[session.reason] ?? "Nu puteți accesa această pagină."}
          </p>
        </div>
      </GuestAppShell>
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
