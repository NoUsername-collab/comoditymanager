import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function SettingsPageHeader({ title, description, actions }: Props) {
  return (
    <header className="settings-page-header">
      <div className="settings-page-header__text">
        <h1 className="settings-page-header__title">{title}</h1>
        {description ? (
          <p className="settings-page-header__desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="settings-page-header__actions">{actions}</div> : null}
    </header>
  );
}
