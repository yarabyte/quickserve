import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServiceAccountEmail } from "@/lib/google/provision";
import { buildWhatsAppDeepLink } from "@/lib/tenant/subscription";

import { SheetSetupClient } from "./setup-client";

export const dynamic = "force-dynamic";

export default async function OnboardingSetupPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/onboarding/setup");
  }

  if (!session.user.restaurantId) {
    if (session.user.role === "SUPERADMIN") {
      redirect("/dashboard/admin");
    }
    redirect("/onboarding");
  }

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.user.restaurantId },
  });

  const deepLink = buildWhatsAppDeepLink(restaurant.slug);
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(deepLink, { margin: 1, width: 256 });
  } catch {
    qrDataUrl = null;
  }

  return (
    <SheetSetupClient
      restaurantName={restaurant.name}
      slug={restaurant.slug}
      deepLink={deepLink}
      qrDataUrl={qrDataUrl}
      sheetVerified={Boolean(restaurant.sheetVerifiedAt && restaurant.googleSpreadsheetId)}
      spreadsheetId={restaurant.googleSpreadsheetId}
      serviceAccountEmail={getServiceAccountEmail()}
    />
  );
}
