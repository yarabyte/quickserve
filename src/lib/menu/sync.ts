import type { PrismaClient } from "@prisma/client";

import { logger } from "@/lib/logger";
import type { MenuItemView } from "@/types/conversation-machine";

/**
 * Serve menu items from Prisma (source of truth — edited in the dashboard).
 * Google Sheets is no longer used for menus.
 */
export async function getMenu(
  restaurantId: string,
  prisma: PrismaClient,
  options: {
    includeUnavailable?: boolean;
  } = {},
): Promise<MenuItemView[]> {
  const rows = await prisma.menuItemCache.findMany({
    where: {
      restaurantId,
      ...(options.includeUnavailable ? {} : { isAvailable: true }),
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    externalRef: row.externalRef,
    categoryName: row.categoryName,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    priceXAF: row.priceXAF,
    isAvailable: row.isAvailable,
    position: row.position,
  }));
}

/** @deprecated Menu is managed in the dashboard; kept for transitional imports. */
export async function syncMenu(
  restaurantId: string,
  _deps: { prisma: PrismaClient },
): Promise<{ upserted: number; deleted: number; syncedAt: Date }> {
  logger.info("menu_sync_skipped_dashboard_source", { restaurantId });
  return { upserted: 0, deleted: 0, syncedAt: new Date() };
}
