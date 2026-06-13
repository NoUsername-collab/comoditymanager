"use client";

import { useTranslations } from "next-intl";
import type { GuestStayMilestoneStep } from "@/domain/guest-app/stay-milestone";

type Props = {
  steps: GuestStayMilestoneStep[];
};

const MILESTONE_KEYS = {
  confirmed: "milestones.confirmed",
  checked_in: "milestones.checkedIn",
  checked_out: "milestones.checkedOut",
} as const;

export function GuestStayMilestoneStrip({ steps }: Props) {
  const t = useTranslations("guestApp");

  return (
    <section className="guest-stay-milestones" aria-label={t("milestones.ariaLabel")}>
      <ol className="guest-stay-milestones__list">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={[
              "guest-stay-milestones__step",
              step.state === "done" && "guest-stay-milestones__step--done",
              step.state === "current" && "guest-stay-milestones__step--current",
              step.state === "upcoming" && "guest-stay-milestones__step--upcoming",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="guest-stay-milestones__marker" aria-hidden>
              {step.state === "done" ? "✓" : index + 1}
            </span>
            <span className="guest-stay-milestones__label">
              {t(MILESTONE_KEYS[step.id])}
            </span>
            {index < steps.length - 1 ? (
              <span className="guest-stay-milestones__connector" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
