import type { PrismaClient } from "@prisma/client";

/** Sample dishes so a new restaurant can demo the WhatsApp bot immediately. */
export async function seedSampleMenu(
  restaurantId: string,
  prisma: PrismaClient,
): Promise<void> {
  const existing = await prisma.menuItemCache.count({ where: { restaurantId } });
  if (existing > 0) return;

  const now = new Date();
  await prisma.menuItemCache.createMany({
    data: [
      {
        restaurantId,
        externalRef: "sample-poulet",
        categoryName: "Plats",
        name: "Poulet DG",
        description: "Exemple — à modifier dans le dashboard",
        priceXAF: 3500,
        isAvailable: true,
        position: 0,
        syncedAt: now,
      },
      {
        restaurantId,
        externalRef: "sample-jus",
        categoryName: "Boissons",
        name: "Jus d'ananas",
        description: "Exemple — à modifier dans le dashboard",
        priceXAF: 1000,
        isAvailable: true,
        position: 1,
        syncedAt: now,
      },
    ],
  });

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { menuSyncedAt: now },
  });
}
