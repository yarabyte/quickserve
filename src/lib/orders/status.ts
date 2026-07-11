import type { OrderStatus, PrismaClient } from "@prisma/client";

import { enqueueSheetJob, scheduleSheetOutboxDrain } from "@/lib/google/queue";
import { t, normalizeLanguage } from "@/i18n";
import { logger } from "@/lib/logger";
import {
  isSessionActive,
  sendSessionText,
  sendTemplate,
} from "@/lib/wati/client";

function statusMessageKey(
  status: OrderStatus,
):
  | "order_status_preparing"
  | "order_status_ready"
  | "order_status_delivered"
  | "order_status_cancelled"
  | null {
  switch (status) {
    case "PREPARING":
      return "order_status_preparing";
    case "READY":
      return "order_status_ready";
    case "DELIVERED":
      return "order_status_delivered";
    case "CANCELLED":
      return "order_status_cancelled";
    default:
      return null;
  }
}

/**
 * Notify the customer on WhatsApp when order status changes.
 * Session message if 24h window open; otherwise approved template.
 */
export async function notifyCustomerOrderStatus(input: {
  prisma: PrismaClient;
  waId: string;
  language: string;
  orderNumber: string;
  status: OrderStatus;
}): Promise<{ ok: boolean; via: "session" | "template" | "skipped" }> {
  const key = statusMessageKey(input.status);
  if (!key) return { ok: true, via: "skipped" };

  const lang = normalizeLanguage(input.language);
  const body = t(key, lang, { orderNumber: input.orderNumber });

  const conversation = await input.prisma.conversation.findUnique({
    where: { waId: input.waId.replace(/\D/g, "") },
    select: { lastInboundAt: true },
  });

  const sessionOk = isSessionActive({
    lastInboundAt: conversation?.lastInboundAt ?? null,
  });

  if (sessionOk) {
    const result = await sendSessionText(input.waId, body);
    if (result.ok) return { ok: true, via: "session" };
  }

  const templateResult = await sendTemplate(
    input.waId,
    process.env.WATI_ORDER_STATUS_TEMPLATE ?? "order_status_update",
    {
      order_number: input.orderNumber,
      status: input.status,
      notice: body.slice(0, 200),
    },
  );

  return { ok: templateResult.ok, via: "template" };
}

/**
 * Dashboard status change: Postgres first, then Sheets status column (async outbox),
 * then WhatsApp notify to the customer.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  deps: { prisma: PrismaClient },
): Promise<{ orderNumber: string; status: OrderStatus }> {
  const order = await deps.prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { customer: true },
  });

  await enqueueSheetJob(deps.prisma, order.restaurantId, {
    kind: "ORDER_STATUS",
    orderNumber: order.orderNumber,
    status,
  });
  scheduleSheetOutboxDrain(deps.prisma);

  void notifyCustomerOrderStatus({
    prisma: deps.prisma,
    waId: order.customer.waId,
    language: order.customer.language || "fr",
    orderNumber: order.orderNumber,
    status,
  }).catch((error) => {
    logger.warn("customer_order_status_notify_failed", {
      orderNumber: order.orderNumber,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info("order_status_updated", {
    orderNumber: order.orderNumber,
    status,
  });

  return { orderNumber: order.orderNumber, status };
}
