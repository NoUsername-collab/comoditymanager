import {
  MAX_MENU_CHILDREN,
  MAX_MENU_ITEMS,
  menuKindNeedsRef,
} from "@/features/public-site/domain/site-pages";
import type { PublicLocale, PublicMenuItem, PublicMenuKind } from "@/features/public-site/domain/types";

/*
 * Editing the header menu: a list of links, each maybe with a submenu of its
 * own links (one level). Every change returns a new list.
 */

/** Where a link goes, as one value for a picker: "home", "page:<id>", "section:<id>", "url"… */
export type MenuTargetValue = string;

export function menuTargetValue(item: Pick<PublicMenuItem, "kind" | "ref">): MenuTargetValue {
  return item.kind === "page" || item.kind === "section" ? `${item.kind}:${item.ref ?? ""}` : item.kind;
}

/** A picked target applied to an item; an address typed for a link elsewhere is kept. */
export function withMenuTarget(item: PublicMenuItem, value: MenuTargetValue): PublicMenuItem {
  const [kind, ref] = value.split(":") as [PublicMenuKind, string | undefined];
  const next: PublicMenuItem = { ...item, kind };
  if (kind === "page" || kind === "section") next.ref = ref;
  else if (kind === "url") next.ref = item.kind === "url" ? item.ref : "";
  else delete next.ref;
  return next;
}

/** Whether an item is ready to save: a page or section picked, an address typed. */
export function menuItemComplete(item: PublicMenuItem): boolean {
  return !menuKindNeedsRef(item.kind) || Boolean(item.ref?.trim());
}

/** Find an item: its parent's id (null at the top) and its index there. */
function locate(menu: PublicMenuItem[], id: string): { parent: string | null; index: number } | null {
  const top = menu.findIndex((item) => item.id === id);
  if (top !== -1) return { parent: null, index: top };
  for (const item of menu) {
    const index = item.children?.findIndex((child) => child.id === id) ?? -1;
    if (index !== -1) return { parent: item.id, index };
  }
  return null;
}

function withChildren(menu: PublicMenuItem[], parentId: string, children: PublicMenuItem[]): PublicMenuItem[] {
  return menu.map((item) => {
    if (item.id !== parentId) return item;
    const next: PublicMenuItem = { ...item, children };
    if (children.length === 0) delete next.children;
    return next;
  });
}

export function canAddMenuItem(menu: PublicMenuItem[], parentId: string | null): boolean {
  if (!parentId) return menu.length < MAX_MENU_ITEMS;
  const parent = menu.find((item) => item.id === parentId);
  return Boolean(parent) && (parent!.children?.length ?? 0) < MAX_MENU_CHILDREN;
}

/** Add a link at the end of the menu, or of an item's submenu. */
export function addMenuItem(
  menu: PublicMenuItem[],
  item: PublicMenuItem,
  parentId: string | null = null,
): PublicMenuItem[] {
  if (!canAddMenuItem(menu, parentId)) return menu;
  if (!parentId) return [...menu, item];
  const parent = menu.find((row) => row.id === parentId)!;
  return withChildren(menu, parentId, [...(parent.children ?? []), item]);
}

export function patchMenuItem(
  menu: PublicMenuItem[],
  id: string,
  update: (item: PublicMenuItem) => PublicMenuItem,
): PublicMenuItem[] {
  return menu.map((item) => {
    if (item.id === id) return update(item);
    if (!item.children?.some((child) => child.id === id)) return item;
    return { ...item, children: item.children.map((child) => (child.id === id ? update(child) : child)) };
  });
}

/**
 * The menu's own names, one per link that has one in any language, addressed
 * `menu.<id>` the same way in every language: a link named only in Romanian
 * still needs a name in English (a submenu or an outside link has nothing else
 * to show and would drop out of that language's menu).
 */
export function menuTextSlots(
  menu: PublicMenuItem[],
  locale: PublicLocale,
): { path: string; value: string }[] {
  return menu
    .flatMap((item) => [item, ...(item.children ?? [])])
    .filter((item) => Object.values(item.label ?? {}).some((text) => (text ?? "").trim()))
    .map((item) => ({ path: `menu.${item.id}`, value: item.label?.[locale] ?? "" }));
}

/** One language's label; the others stay. */
export function setMenuLabel(
  menu: PublicMenuItem[],
  id: string,
  locale: PublicLocale,
  label: string,
): PublicMenuItem[] {
  return patchMenuItem(menu, id, (item) => ({ ...item, label: { ...item.label, [locale]: label } }));
}

/** Take a link away; an item's submenu goes with it. */
export function removeMenuItem(menu: PublicMenuItem[], id: string): PublicMenuItem[] {
  const at = locate(menu, id);
  if (!at) return menu;
  if (!at.parent) return menu.filter((item) => item.id !== id);
  const parent = menu.find((item) => item.id === at.parent)!;
  return withChildren(menu, at.parent, parent.children!.filter((child) => child.id !== id));
}

/** Swap a link with its neighbour in the same list. */
export function moveMenuItem(menu: PublicMenuItem[], id: string, direction: -1 | 1): PublicMenuItem[] {
  const at = locate(menu, id);
  if (!at) return menu;
  const list = at.parent ? [...menu.find((item) => item.id === at.parent)!.children!] : [...menu];
  const target = at.index + direction;
  if (target < 0 || target >= list.length) return menu;
  [list[at.index], list[target]] = [list[target]!, list[at.index]!];
  return at.parent ? withChildren(menu, at.parent, list) : list;
}

/** Whether a top-level link can go into the submenu of the one above it. */
export function canIndentMenuItem(menu: PublicMenuItem[], id: string): boolean {
  const index = menu.findIndex((item) => item.id === id);
  if (index <= 0) return false;
  const item = menu[index]!;
  const above = menu[index - 1]!;
  return item.kind !== "group" && !item.children?.length && (above.children?.length ?? 0) < MAX_MENU_CHILDREN;
}

/** Put a top-level link at the end of the submenu of the link above it. */
export function indentMenuItem(menu: PublicMenuItem[], id: string): PublicMenuItem[] {
  if (!canIndentMenuItem(menu, id)) return menu;
  const index = menu.findIndex((item) => item.id === id);
  const item = menu[index]!;
  const above = menu[index - 1]!;
  const rest = menu.filter((row) => row.id !== id);
  return withChildren(rest, above.id, [...(above.children ?? []), item]);
}

/** Take a submenu link out, to just after its parent. */
export function outdentMenuItem(menu: PublicMenuItem[], id: string): PublicMenuItem[] {
  const at = locate(menu, id);
  if (!at?.parent || menu.length >= MAX_MENU_ITEMS) return menu;
  const parentIndex = menu.findIndex((item) => item.id === at.parent);
  const parent = menu[parentIndex]!;
  const item = parent.children![at.index]!;
  const next = withChildren(menu, parent.id, parent.children!.filter((child) => child.id !== id));
  return [...next.slice(0, parentIndex + 1), item, ...next.slice(parentIndex + 1)];
}

/**
 * The menu as saved: links not finished yet (no page picked, no address) are
 * left out, like an empty row of a list; addresses are trimmed.
 */
export function menuToSave(menu: PublicMenuItem[]): PublicMenuItem[] {
  const clean = (item: PublicMenuItem): PublicMenuItem | null => {
    if (!menuItemComplete(item)) return null;
    const next: PublicMenuItem = { ...item, ...(item.ref !== undefined ? { ref: item.ref.trim() } : {}) };
    if (item.children) {
      const children = item.children.map(clean).filter((child): child is PublicMenuItem => child !== null);
      if (children.length > 0) next.children = children;
      else delete next.children;
    }
    return next;
  };
  return menu.map(clean).filter((item): item is PublicMenuItem => item !== null);
}
