import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";

import { auth } from "@/auth";
import { withTenant, restaurantWhere } from "@/lib/auth/tenant";
import { updateOrderStatus } from "@/lib/orders/status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUSES = new Set<OrderStatus>([
  "DRAFT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

/** PATCH /api/orders/:orderId/status — scoped via withTenant(session). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  const session = await auth();
  const { orderId } = await context.params;
  const body = (await request.json()) as { status?: string };

  if (!body.status || !STATUSES.has(body.status as OrderStatus)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  try {
    const result = await withTenant(session, async (scope) => {
      const order = await prisma.order.findFirst({
        where: { id: orderId, ...restaurantWhere(scope) },
      });
      if (!order) throw new Error("not_found");
      return updateOrderStatus(order.id, body.status as OrderStatus, { prisma });
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    const status = message === "not_found" || message.includes("tenant") ? 404 : 401;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
