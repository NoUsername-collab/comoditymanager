import type { GuestStayMilestoneStep } from "@/domain/guest-app/stay-milestone";

type Props = {
  steps: GuestStayMilestoneStep[];
};

export function GuestStayMilestoneStrip({ steps }: Props) {
  return (
    <section
      className="guest-stay-milestones"
      aria-label="Etape sejur"
    >
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
            <span className="guest-stay-milestones__label">{step.label}</span>
            {index < steps.length - 1 ? (
              <span className="guest-stay-milestones__connector" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
