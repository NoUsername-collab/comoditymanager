import { Link } from "@/i18n/navigation";

type Props = {
  href: string;
  label: string;
  external?: boolean;
};

export function SettingsPreviewLink({ href, label, external = false }: Props) {
  if (external) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="settings-preview-link"
      >
        {label}
        <span className="settings-preview-link__icon" aria-hidden>
          ↗
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="settings-preview-link">
      {label}
      <span className="settings-preview-link__icon" aria-hidden>
        →
      </span>
    </Link>
  );
}
