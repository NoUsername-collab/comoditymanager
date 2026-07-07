import { getTranslations } from "next-intl/server";
import { buildTenantSiteUrl } from "@/lib/tenant/host";
import type { TenantLastActivity } from "@/services/platform-admin";

export async function TenantActivityPanel({
  activity,
}: {
  activity: TenantLastActivity;
}) {
  const t = await getTranslations("platformAdmin.tenantDetail.activity");

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>
      {!activity.lastActivityAt ? (
        <p className="text-xs text-neutral-500">{t("empty")}</p>
      ) : (
        <>
          <InfoRow
            label={t("lastAt")}
            value={new Date(activity.lastActivityAt).toLocaleString("ro")}
          />
          <InfoRow label={t("lastAction")} value={activity.lastAction ?? "—"} />
          <InfoRow
            label={t("lastActor")}
            value={activity.lastActorEmail ?? "—"}
          />
        </>
      )}
    </div>
  );
}

export async function TenantSiteLinksPanel({ slug }: { slug: string }) {
  const t = await getTranslations("platformAdmin.tenantDetail.siteLinks");
  const baseUrl = buildTenantSiteUrl(slug);
  const links = [
    { href: `${baseUrl}/admin`, label: t("admin") },
    { href: `${baseUrl}/calendar`, label: t("publicCalendar") },
    { href: baseUrl, label: t("publicSite") },
  ];

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[var(--ml-touch-min,2.75rem)] items-center justify-between gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-sky-400 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
            >
              <span>{link.label}</span>
              <span className="truncate font-mono text-[11px] text-neutral-500">
                {link.href.replace(/^https?:\/\//, "")}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-sm text-neutral-200">{value}</span>
    </div>
  );
}
