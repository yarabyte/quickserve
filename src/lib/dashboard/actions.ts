"use server";

import type { OrderStatus, PaymentStatus, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { withTenant, restaurantWhere } from "@/lib/auth/tenant";
import { syncMenu } from "@/lib/menu/sync";
import { updateOrderStatus } from "@/lib/orders/status";
import { prisma } from "@/lib/prisma";

const orderStatusFlow: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
];

export async function advanceOrderStatus(orderId: string) {
  const session = await auth();
  return withTenant(session, async (scope) => {
    const order = await prisma.order.findFirst({
      where: { id: orderId, ...restaurantWhere(scope) },
    });
    if (!order) throw new Error("Commande introuvable");

    const idx = orderStatusFlow.indexOf(order.status);
    if (idx < 0 || idx >= orderStatusFlow.length - 1) {
      throw new Error("Transition de statut impossible");
    }

    const next = orderStatusFlow[idx + 1]!;
    await updateOrderStatus(order.id, next, { prisma });
    revalidatePath("/dashboard/orders");
    return { status: next };
  });
}

export async function markOrderPaid(orderId: string) {
  const session = await auth();
  return withTenant(session, async (scope) => {
    const order = await prisma.order.findFirst({
      where: { id: orderId, ...restaurantWhere(scope) },
    });
    if (!order) throw new Error("Commande introuvable");

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID" satisfies PaymentStatus },
    });
    revalidatePath("/dashboard/orders");
    return { paymentStatus: "PAID" as const };
  });
}

export async function setReservationStatus(
  reservationId: string,
  status: Extract<ReservationStatus, "CONFIRMED" | "CANCELLED">,
) {
  const session = await auth();
  return withTenant(session, async (scope) => {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, ...restaurantWhere(scope) },
    });
    if (!reservation) throw new Error("Réservation introuvable");

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status },
    });
    revalidatePath("/dashboard/reservations");
    return { status };
  });
}

export async function resyncMenuAction(restaurantId: string) {
  const session = await auth();
  return withTenant(
    session,
    async () => {
      const result = await syncMenu(restaurantId, { prisma });
      revalidatePath("/dashboard/menu");
      return result;
    },
    { restaurantId },
  );
}

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phoneWhatsappNotify: z.string().trim().max(32).optional().nullable(),
  defaultLanguage: z.enum(["fr", "en"]),
  googleSpreadsheetId: z.string().trim().max(200).optional().nullable(),
  isOpen: z.boolean(),
  openingHoursJson: z.string().optional(),
});

export async function updateRestaurantSettings(
  restaurantId: string,
  raw: z.infer<typeof settingsSchema>,
) {
  const session = await auth();
  const parsed = settingsSchema.parse(raw);

  return withTenant(
    session,
    async () => {
      let openingHours: unknown = undefined;
      if (parsed.openingHoursJson?.trim()) {
        try {
          openingHours = JSON.parse(parsed.openingHoursJson);
        } catch {
          throw new Error("Horaires JSON invalide");
        }
      }

      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: parsed.name,
          phoneWhatsappNotify: parsed.phoneWhatsappNotify || null,
          defaultLanguage: parsed.defaultLanguage,
          googleSpreadsheetId: parsed.googleSpreadsheetId || null,
          isOpen: parsed.isOpen,
          ...(openingHours !== undefined ? { openingHours: openingHours as object } : {}),
        },
      });
      revalidatePath("/dashboard/settings");
      return { ok: true };
    },
    { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
  );
}

export async function resolveDashboardRestaurantId(
  preferredId?: string | null,
): Promise<string | null> {
  const session = await auth();
  return withTenant(session, async (scope) => {
    if (scope.kind === "restaurant") return scope.restaurantId;
    if (preferredId) return preferredId;
    const first = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
    return first?.id ?? null;
  });
}
