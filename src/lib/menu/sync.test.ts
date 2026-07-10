import { describe, expect, it, vi } from "vitest";

import { getMenu, syncMenu } from "./sync";

describe("syncMenu", () => {
  it("upserts items and deletes missing refs", async () => {
    const upserts: unknown[] = [];
    const prisma = {
      restaurant: {
        findUniqueOrThrow: vi.fn(async () => ({
          id: "r1",
          googleSpreadsheetId: "sheet-1",
        })),
        update: vi.fn(async () => ({})),
      },
      menuItemCache: {
        upsert: vi.fn(async (args: unknown) => {
          upserts.push(args);
          return {};
        }),
        findMany: vi.fn(async () => [
          { id: "old", externalRef: "gone" },
          { id: "keep", externalRef: "row-1" },
        ]),
        deleteMany: vi.fn(async () => ({ count: 1 })),
      },
    };

    const sheets = {
      readMenu: vi.fn(async () => [
        {
          categoryName: "Plats",
          name: "Poulet",
          description: null,
          priceXAF: 3500,
          isAvailable: true,
          externalRef: "row-1",
          position: 0,
        },
      ]),
      appendOrderRow: vi.fn(),
      appendReservationRow: vi.fn(),
      updateOrderStatusRow: vi.fn(),
    };

    const result = await syncMenu("r1", { prisma: prisma as never, sheets: sheets as never });

    expect(result.upserted).toBe(1);
    expect(result.deleted).toBe(1);
    expect(prisma.menuItemCache.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old"] } },
    });
    expect(prisma.restaurant.update).toHaveBeenCalled();
  });
});

describe("getMenu TTL", () => {
  it("serves cache and triggers background resync when stale", async () => {
    const triggerResync = vi.fn();
    const prisma = {
      restaurant: {
        findUnique: vi.fn(async () => ({
          menuSyncedAt: new Date("2026-07-10T10:00:00.000Z"),
          googleSpreadsheetId: "sheet-1",
        })),
      },
      menuItemCache: {
        findMany: vi.fn(async () => [
          {
            externalRef: "row-1",
            categoryName: "Plats",
            name: "Poulet",
            description: null,
            priceXAF: 3500,
            isAvailable: true,
            position: 0,
          },
        ]),
      },
    };

    const menu = await getMenu("r1", prisma as never, {
      now: new Date("2026-07-10T10:15:00.000Z"),
      ttlMs: 10 * 60 * 1000,
      triggerResync,
    });

    expect(menu).toHaveLength(1);
    expect(triggerResync).toHaveBeenCalledWith("r1");
  });

  it("does not resync when cache is fresh", async () => {
    const triggerResync = vi.fn();
    const prisma = {
      restaurant: {
        findUnique: vi.fn(async () => ({
          menuSyncedAt: new Date("2026-07-10T10:12:00.000Z"),
          googleSpreadsheetId: "sheet-1",
        })),
      },
      menuItemCache: {
        findMany: vi.fn(async () => []),
      },
    };

    await getMenu("r1", prisma as never, {
      now: new Date("2026-07-10T10:15:00.000Z"),
      ttlMs: 10 * 60 * 1000,
      triggerResync,
    });

    expect(triggerResync).not.toHaveBeenCalled();
  });
});
