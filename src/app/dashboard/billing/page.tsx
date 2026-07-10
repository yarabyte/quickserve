import Link from "next/link";

import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { evaluateSubscription } from "@/lib/tenant/subscription";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    id: "trial",
    name: "Essai",
    price: "Gratuit",
    period: "14 jours",
    features: ["1 restaurant", "Commandes + réservations WhatsApp", "Menu Google Sheets"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "15 000 FCFA",
    period: "/ mois",
    features: ["Tout l'essai", "Support prioritaire", "Notifications staff illimitées"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "35 000 FCFA",
    period: "/ mois",
    features: ["Multi-utilisateurs", "Exports avancés", "SLA"],
  },
];

export default async function BillingPage() {
  const session = await auth();

  const restaurant = await withTenant(session, async (scope) => {
    if (scope.kind !== "restaurant") {
      return prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
    }
    return prisma.restaurant.findUnique({ where: { id: scope.restaurantId } });
  });

  const gate = restaurant ? evaluateSubscription(restaurant) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("dash.billing.title", "fr")}</h1>
        <p className="text-sm text-muted-foreground">
          Statut actuel :{" "}
          <strong>{restaurant?.subscriptionStatus ?? "—"}</strong>
          {restaurant?.trialEndsAt
            ? ` · essai jusqu'au ${restaurant.trialEndsAt.toLocaleDateString("fr-FR")}`
            : ""}
        </p>
        {gate && !gate.active ? (
          <p className="mt-2 text-sm text-destructive">{gate.messageFr}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-lg font-semibold text-foreground">{plan.price}</span>{" "}
                {plan.period}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {plan.id === "trial" ? (
                <Button variant="outline" disabled className="w-full">
                  Plan actuel (essai)
                </Button>
              ) : (
                <Button className="w-full" disabled title="Paiement réel = v2">
                  Upgrade (bientôt)
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Le paiement en ligne arrive en v2. Pour réactiver un compte suspendu en attendant,
        contactez le support QuickServe.{" "}
        <Link href="/onboarding/setup" className="underline">
          Revoir le Sheet
        </Link>
      </p>
    </div>
  );
}
