import { getTranslations } from "next-intl/server";

type Props = {
  checkIn?: string | null;
  checkOut?: string | null;
  className?: string;
};

export async function GuestStayHours({ checkIn, checkOut, className }: Props) {
  const checkInTime = checkIn?.trim().slice(0, 5);
  const checkOutTime = checkOut?.trim().slice(0, 5);
  if (!checkInTime && !checkOutTime) return null;

  const t = await getTranslations("guestApp.home");
  const parts = [
    checkInTime ? t("checkInFrom", { time: checkInTime }) : null,
    checkOutTime ? t("checkOutBy", { time: checkOutTime }) : null,
  ].filter(Boolean);

  return <p className={className ?? "guest-app__stay-hours"}>{parts.join(" · ")}</p>;
}
