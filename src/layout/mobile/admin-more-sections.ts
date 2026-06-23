import type { AdminMoreLink } from "@/layout/mobile/admin-more-links";

export type AdminMoreSectionId = "operations" | "config" | "other";

export type AdminMoreSection = {
  id: AdminMoreSectionId;
  labelKey: "drawerGroupOperations" | "drawerGroupConfig" | "drawerGroupOther";
  linkLabelKeys: AdminMoreLink["labelKey"][];
};

export const ADMIN_MORE_SECTIONS: AdminMoreSection[] = [
  {
    id: "operations",
    labelKey: "drawerGroupOperations",
    linkLabelKeys: ["receptie", "disponibilitate", "statistics"],
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

export type AdminMoreSectionGroup = AdminMoreSection & { links: AdminMoreLink[] };

export function groupAdminMoreLinks(links: AdminMoreLink[]): AdminMoreSectionGroup[] {
  const byKey = new Map(links.map((link) => [link.labelKey, link]));
  return ADMIN_MORE_SECTIONS.map((section) => ({
    ...section,
    links: section.linkLabelKeys
      .map((key) => byKey.get(key))
      .filter((link): link is AdminMoreLink => link != null),
  })).filter((section) => section.links.length > 0);
}
