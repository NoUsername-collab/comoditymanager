import type { PublicContactConfig } from "@/features/public-site/domain/types";

function normalizeUrl(value: string | null | undefined, prefix?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (prefix) return `${prefix}${trimmed.replace(/^@/, "")}`;
  return trimmed;
}

export function buildPublicContactLinks(contact: PublicContactConfig) {
  const email = contact.email?.trim() || null;
  const phone = contact.phone?.trim() || null;
  const whatsappRaw = contact.whatsapp?.trim() || null;
  const telegramRaw = contact.telegram?.trim() || null;
  const facebook = normalizeUrl(contact.facebook, "https://");
  const instagram = normalizeUrl(contact.instagram, "https://");

  const whatsappDigits = whatsappRaw?.replace(/[^\d+]/g, "") ?? null;
  const whatsapp = whatsappDigits
    ? `https://wa.me/${whatsappDigits.replace(/^\+/, "")}`
    : null;

  const telegram = telegramRaw
    ? normalizeUrl(telegramRaw, "https://t.me/") ??
      `https://t.me/${telegramRaw.replace(/^@/, "")}`
    : null;

  return [
    email
      ? { id: "email", label: "Email", href: `mailto:${email}`, external: false }
      : null,
    phone
      ? { id: "phone", label: phone, href: `tel:${phone.replace(/\s/g, "")}`, external: false }
      : null,
    whatsapp
      ? { id: "whatsapp", label: "WhatsApp", href: whatsapp, external: true }
      : null,
    telegram
      ? { id: "telegram", label: "Telegram", href: telegram, external: true }
      : null,
    facebook
      ? { id: "facebook", label: "Facebook", href: facebook, external: true }
      : null,
    instagram
      ? { id: "instagram", label: "Instagram", href: instagram, external: true }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    href: string;
    external: boolean;
  }[];
}

export function PublicContactBar({
  contact,
  title = "Contact",
}: {
  contact: PublicContactConfig;
  title?: string;
}) {
  const links = buildPublicContactLinks(contact);
  if (links.length === 0) return null;

  return (
    <section className="pub-contact-bar" aria-label={title}>
      <div className="pub-contact-bar__inner">
        <p className="pub-contact-bar__title">{title}</p>
        <div className="pub-contact-bar__links">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`pub-contact-chip pub-contact-chip--${link.id}`}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
