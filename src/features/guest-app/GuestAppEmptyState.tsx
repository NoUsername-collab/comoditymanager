type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function GuestAppEmptyState({ title, description, action }: Props) {
  return (
    <div className="guest-app__empty">
      <p className="guest-app__empty__title">{title}</p>
      <p className="guest-app__empty__desc">{description}</p>
      {action ? <div className="guest-app__empty__action">{action}</div> : null}
    </div>
  );
}
