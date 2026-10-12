import type { AdminMoreLink } from "@/layout/mobile/admin-more-links";

type AdminMoreSectionId = "operations" | "config" | "other";

type AdminMoreSection = {
  id: AdminMoreSectionId;
  labelKey: "drawerGroupOperations" | "drawerGroupConfig" | "drawerGroupOther";
  linkLabelKeys: AdminMoreLink["labelKey"][];
};

const ADMIN_MORE_SECTIONS: AdminMoreSection[] = [
  {
    id: "operations",
    labelKey: "drawerGroupOperations",
    linkLabelKeys: ["reception", "availability", "statistics"],
  },
  {
    id: "config",
    labelKey: "drawerGroupConfig",
    linkLabelKeys: ["settings", "buildings", "rooms"],
  },
  {
    id: "other",
    labelKey: "drawerGroupOther",
    linkLabelKeys: ["devlog"],
  },
];

type AdminMoreSectionGroup = AdminMoreSection & { links: AdminMoreLink[] };

export function groupAdminMoreLinks(links: AdminMoreLink[]): AdminMoreSectionGroup[] {
  const byKey = new Map(links.map((link) => [link.labelKey, link]));
  return ADMIN_MORE_SECTIONS.map((section) => ({
    ...section,
    links: section.linkLabelKeys
      .map((key) => byKey.get(key))
      .filter((link): link is AdminMoreLink => link != null),
  })).filter((section) => section.links.length > 0);
}
