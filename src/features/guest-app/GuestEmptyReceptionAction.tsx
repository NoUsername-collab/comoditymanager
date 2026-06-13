import { getTranslations } from "next-intl/server";

type Props = {
  phone?: string | null;
};

export async function GuestEmptyReceptionAction({ phone }: Props) {
  const normalized = phone?.trim();
  if (!normalized) return null;

  const t = await getTranslations("guestApp.empty");

  return (
    <a href={`tel:${normalized}`} className="guest-app__empty__cta">
      {t("callReception")}
    </a>
  );
}
