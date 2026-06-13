export type SettingsAlert = {
  tone: "success" | "warning" | "error" | "info";
  message: string;
};

type Props = {
  alerts: SettingsAlert[];
};

export function SettingsAlerts({ alerts }: Props) {
  if (!alerts.length) return null;

  return (
    <div className="settings-alerts">
      {alerts.map((alert, index) => (
        <p
          key={`${alert.tone}-${index}`}
          className={`settings-alerts__item settings-alerts__item--${alert.tone}`}
          role="status"
        >
          {alert.message}
        </p>
      ))}
    </div>
  );
}
