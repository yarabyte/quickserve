import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireRole } from "@/lib/auth/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        title="Admin — Restaurants"
        description="Vue SUPERADMIN · abonnements et accès rapides"
      />

      <div className="space-y-3">
        {restaurants.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-display text-lg">
                  {r.name}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    /{r.slug}
                  </span>
                </CardTitle>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {r._count.orders} cmd · {r._count.reservations} résa · {r._count.menuItems}{" "}
                  plats
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
              <Link
                className="rounded-lg bg-surface px-3 py-1.5 font-medium text-primary ring-1 ring-border hover:bg-muted"
                href={`/dashboard/orders?restaurantId=${r.id}`}
              >
                Commandes
              </Link>
              <Link
                className="rounded-lg bg-surface px-3 py-1.5 font-medium text-primary ring-1 ring-border hover:bg-muted"
                href={`/dashboard/menu?restaurantId=${r.id}`}
              >
                Menu
              </Link>
              <Link
                className="rounded-lg bg-surface px-3 py-1.5 font-medium text-primary ring-1 ring-border hover:bg-muted"
                href={`/dashboard/settings?restaurantId=${r.id}`}
              >
                Réglages
              </Link>
              {r.trialEndsAt ? (
                <span className="self-center text-muted-foreground">
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
