import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
};

export function GuestAppEmptyState({ title, description, action, icon = "○" }: Props) {
  return (
    <div className="guest-app__empty" role="status">
      <span className="guest-app__empty__icon" aria-hidden>
        {icon}
      </span>
      <p className="guest-app__empty__title">{title}</p>
      <p className="guest-app__empty__desc">{description}</p>
      {action ? <div className="guest-app__empty__action">{action}</div> : null}
    </div>
  );
}
