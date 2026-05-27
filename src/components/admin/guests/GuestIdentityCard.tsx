import type { ReactNode } from "react";
import type { GuestRow } from "@/domain/guest/types";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { formatRoDate } from "@/lib/stay-dates";

function IdentityField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex h-full min-h-[84px] flex-col justify-between rounded-md border px-3 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className={[
          "mt-1 text-sm font-semibold",
          mono && "break-all font-mono text-[12px]",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ color: "var(--text)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function GuestIdentityCard({
  guest,
  footer,
}: {
  guest: GuestRow;
  footer?: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border px-4 py-4"
      style={{
        borderColor: "var(--admin-panel-border)",
        background: "var(--admin-panel-bg)",
        color: "var(--admin-text)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-muted)" }}
          >
            Identitate client
          </p>
          <h2 className="mt-1 truncate text-2xl font-black" style={{ color: "var(--text)" }}>
            {guest.display_name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GuestFlagPill flagLevel={guest.profile?.flag_level} />
          <span
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-muted)",
            }}
          >
            Client din {formatRoDate(guest.created_at.slice(0, 10))}
          </span>
        </div>
      </div>

      <div className="mt-4 grid items-stretch gap-3 md:grid-cols-2">
        <IdentityField label="Email" value={guest.email ?? "Fără email"} />
        <IdentityField label="Telefon" value={guest.phone ?? "Fără telefon"} />
        <IdentityField label="ID client" value={guest.id} mono />
        <IdentityField
          label="Ultima actualizare"
          value={formatRoDate(guest.updated_at.slice(0, 10))}
        />
      </div>

      {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
    </section>
  );
}
