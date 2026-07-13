import Link from "next/link";
import { Check, CreditCard } from "lucide-react";

import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { evaluateSubscription } from "@/lib/tenant/subscription";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    id: "trial",
    name: "Essai",
    price: "Gratuit",
    period: "14 jours",
    features: ["1 restaurant", "Commandes + réservations WhatsApp", "Menu + photos dashboard"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "15 000 FCFA",
    period: "/ mois",
    features: ["Tout l'essai", "Support prioritaire", "Notifications staff illimitées"],
    highlighted: true,
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
      <PageHeader
        icon={CreditCard}
        title={t("dash.billing.title", "fr")}
        description={
          <>
            Statut actuel :{" "}
            <strong className="text-foreground">
              {restaurant?.subscriptionStatus ?? "—"}
            </strong>
            {restaurant?.trialEndsAt
              ? ` · essai jusqu'au ${restaurant.trialEndsAt.toLocaleDateString("fr-FR")}`
              : ""}
          </>
        }
      />

      {gate && !gate.active ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
          {gate.messageFr}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              plan.highlighted && "ring-2 ring-primary/30",
            )}
          >
            <CardHeader>
              <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="font-display text-2xl font-semibold text-foreground">
                  {plan.price}
                </span>{" "}
                <span className="text-muted-foreground">{plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
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
        <Link href="/onboarding/setup" className="font-medium text-primary underline-offset-2 hover:underline">
          Revoir le Sheet
        </Link>
      </p>
    </div>
  );
}
