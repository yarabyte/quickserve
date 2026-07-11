import Link from "next/link";

import { auth } from "@/auth";
import { evaluateSubscription } from "@/lib/tenant/subscription";
import { prisma } from "@/lib/prisma";

export async function SubscriptionBanner() {
  const session = await auth();
  if (!session?.user?.restaurantId) return null;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      googleSpreadsheetId: true,
      sheetVerifiedAt: true,
    },
  });
  if (!restaurant) return null;

  const gate = evaluateSubscription(restaurant);

  if (gate.active && restaurant.subscriptionStatus === "TRIAL" && restaurant.trialEndsAt) {
    const days = Math.max(
      0,
      Math.ceil((restaurant.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    return (
      <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 backdrop-blur">
        Essai gratuit — <strong>{days} j</strong> restant{days > 1 ? "s" : ""}.{" "}
        <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">
          Voir les plans
        </Link>
      </div>
    );
  }

  if (!gate.active) {
    const title =
      gate.reason === "MISSING_SHEET"
        ? "Configuration incomplète — connectez Google Sheets"
        : "Abonnement suspendu — service client coupé";

    const href = gate.reason === "MISSING_SHEET" ? "/onboarding/setup" : "/dashboard/billing";

    return (
      <div className="border-b border-red-200/80 bg-red-50/90 px-4 py-2.5 text-sm text-red-950 backdrop-blur">
        {title}.{" "}
        <Link href={href} className="font-semibold underline underline-offset-2">
          {gate.reason === "MISSING_SHEET" ? "Terminer l'onboarding" : "Upgrade"}
        </Link>
      </div>
    );
  }

  return null;
}
