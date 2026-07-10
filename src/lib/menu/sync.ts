import type { PrismaClient } from "@prisma/client";

import { getSheetsClient, type SheetsClient } from "@/lib/google/sheets";
import { logger } from "@/lib/logger";
import type { MenuItemView } from "@/types/conversation-machine";

export const MENU_CACHE_TTL_MS = 10 * 60 * 1000;

export type SyncMenuResult = {
  upserted: number;
  deleted: number;
  syncedAt: Date;
};

/**
 * Pull Menu tab from Google Sheets into MenuItemCache.
 * Source of truth = Sheet; cache is for the bot only.
 */
export async function syncMenu(
  restaurantId: string,
  deps: {
    prisma: PrismaClient;
    sheets?: SheetsClient;
  },
): Promise<SyncMenuResult> {
  const restaurant = await deps.prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
  });

  if (!restaurant.googleSpreadsheetId) {
    throw new Error(`Restaurant ${restaurantId} has no googleSpreadsheetId`);
  }

  const sheets = deps.sheets ?? getSheetsClient();
  const items = await sheets.readMenu(restaurant.googleSpreadsheetId);
  const syncedAt = new Date();
  const refs = new Set(items.map((i) => i.externalRef));

  for (const [index, item] of items.entries()) {
    await deps.prisma.menuItemCache.upsert({
      where: {
        restaurantId_externalRef: {
          restaurantId,
          externalRef: item.externalRef,
        },
      },
      create: {
        restaurantId,
        externalRef: item.externalRef,
        categoryName: item.categoryName,
        name: item.name,
        description: item.description ?? null,
        priceXAF: item.priceXAF,
        isAvailable: item.isAvailable,
        position: item.position ?? index,
        syncedAt,
      },
      update: {
        categoryName: item.categoryName,
        name: item.name,
        description: item.description ?? null,
        priceXAF: item.priceXAF,
        isAvailable: item.isAvailable,
        position: item.position ?? index,
        syncedAt,
      },
    });
  }

  const existing = await deps.prisma.menuItemCache.findMany({
    where: { restaurantId },
    select: { id: true, externalRef: true },
  });
  const toDelete = existing.filter((row) => !refs.has(row.externalRef));
  if (toDelete.length > 0) {
    await deps.prisma.menuItemCache.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
  }

  await deps.prisma.restaurant.update({
    where: { id: restaurantId },
    data: { menuSyncedAt: syncedAt },
  });

  logger.info("menu_synced", {
    restaurantId,
    upserted: items.length,
    deleted: toDelete.length,
  });

  return { upserted: items.length, deleted: toDelete.length, syncedAt };
}

function isStale(menuSyncedAt: Date | null, now: Date, ttlMs: number): boolean {
  if (!menuSyncedAt) return true;
  return now.getTime() - menuSyncedAt.getTime() > ttlMs;
}

/**
 * Serve MenuItemCache only. Never calls Sheets on the hot path.
 * If TTL expired, schedules a background resync.
 */
export async function getMenu(
  restaurantId: string,
  prisma: PrismaClient,
  options: {
    ttlMs?: number;
    now?: Date;
    triggerResync?: (restaurantId: string) => void;
    includeUnavailable?: boolean;
  } = {},
): Promise<MenuItemView[]> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { menuSyncedAt: true, googleSpreadsheetId: true },
  });

  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? MENU_CACHE_TTL_MS;

  if (
    restaurant?.googleSpreadsheetId &&
    isStale(restaurant.menuSyncedAt, now, ttlMs)
  ) {
    const trigger =
      options.triggerResync ??
      ((id: string) => {
        void syncMenu(id, { prisma }).catch((error) => {
          logger.warn("menu_background_resync_failed", {
            restaurantId: id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      });
    trigger(restaurantId);
  }

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
    priceXAF: row.priceXAF,
    isAvailable: row.isAvailable,
    position: row.position,
  }));
}
