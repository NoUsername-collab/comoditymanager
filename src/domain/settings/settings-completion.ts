import type { PensionContact } from "@/domain/settings/pension-identity";
import {
  isEmailChannelConfigured,
  isIdentityConfigured,
} from "@/domain/setup-issues/progress";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { SETUP_ISSUE_IDS } from "@/domain/setup-issues/types";

type SettingsCompletionItem = {
  id: string;
  labelKey: string;
  done: boolean;
  href: string;
};

export type SettingsCompletionSummary = {
  percent: number;
  completeCount: number;
  totalCount: number;
  /** The setup steps, in the order a new owner should do them. */
  items: SettingsCompletionItem[];
  /** First step not done yet — where "Continue" leads. */
  next: SettingsCompletionItem | null;
  /** Extra checks for the public site, shown under its own heading. */
  publicItems: SettingsCompletionItem[];
};

type PublicSiteCompletionSnapshot = {
  published: boolean;
  bookingEnabled: boolean;
  hasContact: boolean;
  hasGallery: boolean;
  hasHeroImage: boolean;
};

function hasSetupIssue(issues: SetupIssue[], id: string): boolean {
  return issues.some((issue) => issue.id === id);
}

export function hasIdentityContact(contact: PensionContact): boolean {
  return Boolean(
    contact.email?.trim() ||
      contact.phone?.trim() ||
      contact.whatsapp?.trim(),
  );
}

export function computeSettingsCompletion(opts: {
  setupIssues: SetupIssue[];
  displayName: string;
  identityContact: PensionContact;
  emailReplyTo?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
  includeMfa?: boolean;
  publicSite: PublicSiteCompletionSnapshot | null;
  roomCount?: number;
}): SettingsCompletionSummary {
  const {
    setupIssues,
    displayName,
    identityContact,
    emailReplyTo,
    emailFromName,
    emailFromAddress,
    includeMfa = true,
    publicSite,
  } = opts;

  const roomCount = opts.roomCount ?? 0;
  const items: SettingsCompletionItem[] = [
    {
      id: "identity",
      labelKey: "checklistIdentity",
      done:
        isIdentityConfigured(displayName) &&
        !hasSetupIssue(setupIssues, SETUP_ISSUE_IDS.CONTACT_EMAIL_MISSING) &&
        Boolean(identityContact.email?.trim()),
      href: "/admin/settings/identity",
    },
    {
      id: "inventory",
      labelKey: "checklistInventory",
      done: roomCount >= 1,
      href: roomCount >= 1 ? "/admin/rooms" : "/admin/onboarding",
    },
  ];

  if (publicSite) {
    items.push({
      id: "public-published",
      labelKey: "checklistPublicPublished",
      done: publicSite.published,
      href: "/admin/settings/public-site",
    });
  }

  items.push({
    id: "email",
    labelKey: "checklistEmail",
    done: isEmailChannelConfigured({
      emailReplyTo,
      emailFromName,
      emailFromAddress,
    }),
    href: "/admin/settings/email",
  });

  if (includeMfa) {
    items.push({
      id: "mfa",
      labelKey: "checklistMfa",
      done: !hasSetupIssue(setupIssues, SETUP_ISSUE_IDS.MFA_NOT_ENABLED),
      href: "/admin/settings/security",
    });
  }

  const publicItems: SettingsCompletionItem[] = publicSite
    ? [
        {
          id: "public-contact",
          labelKey: "checklistPublicContact",
          done: publicSite.hasContact,
          href: "/admin/settings/public-site",
        },
        {
          id: "public-booking",
          labelKey: "checklistPublicBooking",
          done: publicSite.bookingEnabled,
          href: "/admin/settings/public-site",
        },
      ]
    : [];

  const completeCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const percent =
    totalCount === 0 ? 100 : Math.round((completeCount / totalCount) * 100);
  const next = items.find((item) => !item.done) ?? null;

  return { percent, completeCount, totalCount, items, next, publicItems };
}
