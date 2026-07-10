import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireRole } from "@/lib/auth/tenant";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  try {
    requireRole(session, ["SUPERADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, reservations: true, menuItems: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin — Restaurants</h1>
        <p className="text-sm text-muted-foreground">Vue SUPERADMIN · abonnements</p>
      </div>

      <div className="space-y-3">
        {restaurants.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-sm">
                  {r.name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">/{r.slug}</span>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r._count.orders} cmd · {r._count.reservations} résa · {r._count.menuItems} plats
                </p>
              </div>
              <Badge
                variant={
                  r.subscriptionStatus === "ACTIVE"
                    ? "success"
                    : r.subscriptionStatus === "SUSPENDED"
                      ? "danger"
                      : "warning"
                }
              >
                {r.subscriptionStatus}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              <Link className="underline" href={`/dashboard/orders?restaurantId=${r.id}`}>
                Commandes
              </Link>
              <Link className="underline" href={`/dashboard/menu?restaurantId=${r.id}`}>
                Menu
              </Link>
              <Link className="underline" href={`/dashboard/settings?restaurantId=${r.id}`}>
                Réglages
              </Link>
              {r.trialEndsAt ? (
                <span className="text-muted-foreground">
                  Trial jusqu&apos;au {r.trialEndsAt.toLocaleDateString("fr-FR")}
                </span>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
