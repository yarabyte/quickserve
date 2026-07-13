import { auth } from "@/auth";
import { withTenant, assertRestaurantAccess } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

import { MenuClient, type MenuItemRow } from "./menu-client";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  try {
    const data = await withTenant(session, async (scope) => {
      let restaurantId =
        scope.kind === "restaurant" ? scope.restaurantId : params.restaurantId ?? null;

      if (!restaurantId && scope.kind === "all") {
        const first = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
        restaurantId = first?.id ?? null;
      }

      if (!restaurantId) {
        return null;
      }

      assertRestaurantAccess(scope, restaurantId);

      const restaurant = await prisma.restaurant.findUniqueOrThrow({
        where: { id: restaurantId },
      });

      const items = await prisma.menuItemCache.findMany({
        where: { restaurantId },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      });

      return {
        restaurant,
        items: items.map(
          (i): MenuItemRow => ({
            id: i.id,
            categoryName: i.categoryName,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            priceXAF: i.priceXAF,
            isAvailable: i.isAvailable,
            externalRef: i.externalRef,
          }),
        ),
      };
    });

    if (!data) {
      return <p className="text-sm text-muted-foreground">Aucun restaurant.</p>;
    }

    return (
      <MenuClient
        restaurantId={data.restaurant.id}
        restaurantName={data.restaurant.name}
        items={data.items}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("dashboard_menu_page_failed", { error: message });

    const missingImageUrl = message.includes("imageUrl");

    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        <p className="font-semibold">Impossible de charger le menu</p>
        <p className="text-red-800/90">
          {missingImageUrl
            ? "La base de données n’a pas encore la colonne photo (imageUrl). Redémarrez le conteneur pour lancer les migrations Prisma, ou exécutez : prisma migrate deploy."
            : message}
        </p>
      </div>
    );
  }
}
