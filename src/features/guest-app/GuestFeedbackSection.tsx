"use client";

import dynamic from "next/dynamic";

const GuestFeedbackForm = dynamic(
  () =>
    import("./GuestFeedbackForm").then((m) => ({
      default: m.GuestFeedbackForm,
    })),
  {
    loading: () => (
      <div
        className="guest-app__skeleton-row"
        aria-busy="true"
        aria-label="…"
      />
    ),
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
