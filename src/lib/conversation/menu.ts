import type { MenuItemView } from "@/types/conversation-machine";

import { LIST_PAGE_SIZE } from "./context";

export { getMenu } from "@/lib/menu/sync";

export function listCategories(menu: MenuItemView[]): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of menu) {
    if (!seen.has(item.categoryName)) {
      seen.add(item.categoryName);
      categories.push(item.categoryName);
    }
  }
  return categories;
}

export function itemsInCategory(menu: MenuItemView[], category: string): MenuItemView[] {
  return menu.filter((item) => item.categoryName === category);
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize = LIST_PAGE_SIZE,
): {
  slice: T[];
  page: number;
  pages: number;
  hasPrev: boolean;
  hasNext: boolean;
} {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    page: safePage,
    pages,
    hasPrev: safePage > 1,
    hasNext: safePage < pages,
  };
}

export function categoryRowId(category: string): string {
  return `cat:${encodeURIComponent(category)}`;
}

export function parseCategoryRowId(value: string): string | null {
  if (!value.startsWith("cat:")) return null;
  try {
    return decodeURIComponent(value.slice(4));
  } catch {
    return value.slice(4);
  }
}

export function itemRowId(externalRef: string): string {
  return `item:${externalRef}`;
}

export function parseItemRowId(value: string): string | null {
  if (!value.startsWith("item:")) return null;
  return value.slice(5);
}
