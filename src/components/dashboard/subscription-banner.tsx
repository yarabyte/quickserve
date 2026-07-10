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
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
        Essai gratuit — {days} j restant{days > 1 ? "s" : ""}.{" "}
        <Link href="/dashboard/billing" className="font-medium underline">
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
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-950">
        {title}.{" "}
        <Link href={href} className="font-medium underline">
          {gate.reason === "MISSING_SHEET" ? "Terminer l'onboarding" : "Upgrade"}
        </Link>
      </div>
    );
  }

  return null;
}
