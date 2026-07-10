import type { PrismaClient } from "@prisma/client";

import {
  buildStaffOrderMessage,
  formatItemsSummary,
} from "@/lib/google/mappers";
import { enqueueSheetJob, scheduleSheetOutboxDrain } from "@/lib/google/queue";
import { logger } from "@/lib/logger";
import { parseContext } from "@/lib/conversation/context";
import type { ConversationContext } from "@/types/conversation-machine";
import {
  isSessionActive,
  sendSessionText,
  sendTemplate,
} from "@/lib/wati/client";

import { generateOrderNumber } from "./order-number";

export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  totalXAF: number;
};

/**
 * Persist order in Postgres (source of truth), enqueue Sheets append,
 * notify staff. Sheets failure never blocks confirmation.
 */
export async function createOrderFromConversation(
  conversation: {
    id: string;
    waId: string;
    restaurantId: string | null;
    language: string;
    context: unknown;
  },
  deps: { prisma: PrismaClient },
): Promise<CreateOrderResult | null> {
  if (!conversation.restaurantId) return null;

  const ctx = parseContext(conversation.context) as ConversationContext;
  if (!ctx.pendingOrder) return null;

  const restaurantId = conversation.restaurantId;
  const pending = ctx.pendingOrder;

  const restaurant = await deps.prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
  });

  const customer = await deps.prisma.customer.upsert({
    where: {
      restaurantId_waId: { restaurantId, waId: conversation.waId },
    },
    update: { language: conversation.language },
    create: {
      restaurantId,
      waId: conversation.waId,
      language: conversation.language,
    },
  });

  const orderNumber = generateOrderNumber(restaurant.slug);
  const order = await deps.prisma.order.create({
    data: {
      orderNumber,
      restaurantId,
      customerId: customer.id,
      type: pending.type,
      status: "CONFIRMED",
      items: pending.items,
      totalXAF: pending.totalXAF,
      deliveryAddress: pending.deliveryAddress,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
    },
  });

  const cleared: ConversationContext = {
    ...ctx,
    items: [],
    pendingOrder: undefined,
    serviceType: undefined,
    deliveryAddress: undefined,
    browse: undefined,
  };

  await deps.prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      context: cleared as import("@prisma/client").Prisma.InputJsonValue,
      state: "START",
    },
  });

  const customerLabel = customer.name?.trim() || conversation.waId;
  const itemsSummary = formatItemsSummary(pending.items);

  await enqueueSheetJob(deps.prisma, restaurantId, {
    kind: "ORDER_APPEND",
    order: {
      orderNumber,
      createdAt: order.createdAt,
      customerLabel,
      type: pending.type,
      itemsSummary,
      totalXAF: pending.totalXAF,
      deliveryAddress: pending.deliveryAddress,
      paymentMethod: "CASH",
      status: "CONFIRMED",
    },
  });
  scheduleSheetOutboxDrain(deps.prisma);

  void notifyStaffNewOrder({
    prisma: deps.prisma,
    restaurantId,
    restaurantName: restaurant.name,
    phoneWhatsappNotify: restaurant.phoneWhatsappNotify,
    orderNumber,
    type: pending.type,
    customerLabel,
    itemsSummary,
    totalXAF: pending.totalXAF,
    deliveryAddress: pending.deliveryAddress,
  }).catch((error) => {
    logger.warn("staff_order_notify_failed", {
      orderNumber,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info("order_created", { orderNumber, restaurantId, totalXAF: pending.totalXAF });

  return { orderId: order.id, orderNumber, totalXAF: pending.totalXAF };
}

export async function notifyStaffNewOrder(input: {
  prisma: PrismaClient;
  restaurantId: string;
  restaurantName: string;
  phoneWhatsappNotify: string | null | undefined;
  orderNumber: string;
  type: "DELIVERY" | "PICKUP";
  customerLabel: string;
  itemsSummary: string;
  totalXAF: number;
  deliveryAddress?: string | null;
}): Promise<{ ok: boolean; via: "session" | "template" | "skipped" }> {
  if (!input.phoneWhatsappNotify) {
    return { ok: true, via: "skipped" };
  }

  const text = buildStaffOrderMessage({
    restaurantName: input.restaurantName,
    orderNumber: input.orderNumber,
    type: input.type,
    customerLabel: input.customerLabel,
    itemsSummary: input.itemsSummary,
    totalXAF: input.totalXAF,
    deliveryAddress: input.deliveryAddress,
  });

  // Staff session: use last inbound on any conversation with that waId if present.
  const staffConv = await input.prisma.conversation.findUnique({
    where: { waId: input.phoneWhatsappNotify.replace(/\D/g, "") },
    select: { lastInboundAt: true },
  });

  const sessionOk = isSessionActive({
    lastInboundAt: staffConv?.lastInboundAt ?? null,
  });

  if (sessionOk) {
    const result = await sendSessionText(input.phoneWhatsappNotify, text);
    if (result.ok) return { ok: true, via: "session" };
  }

  const templateResult = await sendTemplate(
    input.phoneWhatsappNotify,
    process.env.WATI_STAFF_ORDER_TEMPLATE ?? "staff_new_order",
    {
      restaurant: input.restaurantName,
      order_number: input.orderNumber,
      total: String(input.totalXAF),
      type: input.type,
      items: input.itemsSummary.slice(0, 200),
    },
  );

  return { ok: templateResult.ok, via: "template" };
}
