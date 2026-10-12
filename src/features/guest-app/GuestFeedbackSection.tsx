"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

function FeedbackFormFallback() {
  const t = useTranslations("guestApp.shell");
  return (
    <div className="guest-app__skeleton-row" aria-busy="true" aria-label={t("loading")} />
  );
}

const GuestFeedbackForm = dynamic(
  () =>
    import("./GuestFeedbackForm").then((m) => ({
      default: m.GuestFeedbackForm,
    })),
  {
    loading: () => <FeedbackFormFallback />,
  },
);

type Props = {
  accessCode: string;
  alreadySubmitted: boolean;
};

export function GuestFeedbackSection({ accessCode, alreadySubmitted }: Props) {
  return (
    <GuestFeedbackForm accessCode={accessCode} alreadySubmitted={alreadySubmitted} />
  );
}
