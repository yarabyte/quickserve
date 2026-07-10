import type { Restaurant, SubscriptionStatus } from "@prisma/client";

export type SubscriptionGate = {
  active: boolean;
  reason?: "SUSPENDED" | "TRIAL_EXPIRED" | "MISSING_SHEET";
  messageFr: string;
  messageEn: string;
};

export function evaluateSubscription(
  restaurant: Pick<
    Restaurant,
    "subscriptionStatus" | "trialEndsAt" | "googleSpreadsheetId" | "sheetVerifiedAt"
  >,
  now = new Date(),
): SubscriptionGate {
  if (restaurant.subscriptionStatus === "SUSPENDED") {
    return {
      active: false,
      reason: "SUSPENDED",
      messageFr: "Service temporairement indisponible. Le restaurant réactive bientôt son abonnement.",
      messageEn: "Service temporarily unavailable. The restaurant will reactivate its subscription soon.",
    };
  }

  if (
    restaurant.subscriptionStatus === "TRIAL" &&
    restaurant.trialEndsAt &&
    restaurant.trialEndsAt.getTime() < now.getTime()
  ) {
    return {
      active: false,
      reason: "TRIAL_EXPIRED",
      messageFr: "Service temporairement indisponible. L'essai gratuit est terminé.",
      messageEn: "Service temporarily unavailable. The free trial has ended.",
    };
  }

  if (!restaurant.googleSpreadsheetId || !restaurant.sheetVerifiedAt) {
    return {
      active: false,
      reason: "MISSING_SHEET",
      messageFr: "Service temporairement indisponible. Configuration en cours.",
      messageEn: "Service temporarily unavailable. Setup in progress.",
    };
  }

  return { active: true, messageFr: "", messageEn: "" };
}

export function isPaidOrTrialActive(
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
  now = new Date(),
): boolean {
  if (status === "ACTIVE") return true;
  if (status === "SUSPENDED") return false;
  if (status === "TRIAL") {
    return !trialEndsAt || trialEndsAt.getTime() >= now.getTime();
  }
  return false;
}

export function slugifyRestaurantName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "restaurant";
}

export function buildWhatsAppDeepLink(slug: string): string {
  const num = (
    process.env.WATI_CHANNEL_NUMBER ??
    process.env.WHATSAPP_BUSINESS_NUMBER ??
    ""
  ).replace(/\D/g, "");
  const text = encodeURIComponent(`RESTO-${slug}`);
  if (!num) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${num}?text=${text}`;
}

export const TRIAL_DAYS = 14;
