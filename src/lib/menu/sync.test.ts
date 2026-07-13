import { describe, expect, it, vi } from "vitest";

import { getMenu, syncMenu } from "./sync";

describe("getMenu", () => {
  it("returns available items from Prisma ordered by position", async () => {
    const prisma = {
      menuItemCache: {
        findMany: vi.fn(async () => [
          {
            externalRef: "row-1",
            categoryName: "Plats",
            name: "Poulet",
            description: null,
            imageUrl: "https://example.com/p.jpg",
            priceXAF: 3500,
            isAvailable: true,
            position: 0,
          },
        ]),
      },
    };

    const menu = await getMenu("r1", prisma as never);

    expect(menu).toEqual([
      {
        externalRef: "row-1",
        categoryName: "Plats",
        name: "Poulet",
        description: null,
        imageUrl: "https://example.com/p.jpg",
        priceXAF: 3500,
        isAvailable: true,
        position: 0,
      },
    ]);
    expect(prisma.menuItemCache.findMany).toHaveBeenCalledWith({
      where: { restaurantId: "r1", isAvailable: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
  });

  it("can include unavailable items", async () => {
    const prisma = {
      menuItemCache: {
        findMany: vi.fn(async () => []),
      },
    };

    await getMenu("r1", prisma as never, { includeUnavailable: true });

    expect(prisma.menuItemCache.findMany).toHaveBeenCalledWith({
      where: { restaurantId: "r1" },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
  });
});

describe("syncMenu", () => {
  it("is a no-op stub (dashboard is source of truth)", async () => {
    const result = await syncMenu("r1", { prisma: {} as never });
    expect(result.upserted).toBe(0);
    expect(result.deleted).toBe(0);
  });
});
