type Props = {
  className?: string;
  pulse?: boolean;
};

export function SetupIssueBadge({ className, pulse = true }: Props) {
  return (
    <span
      className={[
        "setup-issue-badge",
        pulse && "setup-issue-badge--pulse",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}
