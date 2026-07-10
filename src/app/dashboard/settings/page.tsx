import QRCode from "qrcode";

import { auth } from "@/auth";
import { withTenant, assertRestaurantAccess } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";

import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

function buildDeepLink(slug: string): string {
  const num = (process.env.WATI_CHANNEL_NUMBER ?? process.env.WHATSAPP_BUSINESS_NUMBER ?? "")
    .replace(/\D/g, "");
  const text = encodeURIComponent(`RESTO-${slug}`);
  if (!num) {
    return `https://wa.me/?text=${text}`;
  }
  return `https://wa.me/${num}?text=${text}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const data = await withTenant(session, async (scope) => {
    let restaurantId =
      scope.kind === "restaurant" ? scope.restaurantId : params.restaurantId ?? null;

    if (!restaurantId && scope.kind === "all") {
      const first = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
      restaurantId = first?.id ?? null;
    }
    if (!restaurantId) return null;

    assertRestaurantAccess(scope, restaurantId);
    return prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
  });

  if (!data) {
    return <p className="text-sm text-muted-foreground">Aucun restaurant.</p>;
  }

  const deepLink = buildDeepLink(data.slug);
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(deepLink, { margin: 1, width: 256 });
  } catch {
    qrDataUrl = null;
  }

  return (
    <SettingsClient
      restaurant={{
        id: data.id,
        name: data.name,
        slug: data.slug,
        phoneWhatsappNotify: data.phoneWhatsappNotify,
        defaultLanguage: data.defaultLanguage,
        googleSpreadsheetId: data.googleSpreadsheetId,
        isOpen: data.isOpen,
        openingHoursJson: JSON.stringify(data.openingHours ?? {}, null, 2),
      }}
      deepLink={deepLink}
      qrDataUrl={qrDataUrl}
      serviceAccountEmail={process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null}
    />
  );
}
