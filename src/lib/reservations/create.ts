import type { PrismaClient } from "@prisma/client";

import { parseContext } from "@/lib/conversation/context";
import { buildStaffReservationMessage } from "@/lib/google/mappers";
import { enqueueSheetJob, scheduleSheetOutboxDrain } from "@/lib/google/queue";
import { logger } from "@/lib/logger";
import type { ConversationContext } from "@/types/conversation-machine";
import {
  isSessionActive,
  sendSessionText,
  sendTemplate,
} from "@/lib/wati/client";

export type CreateReservationResult = {
  reservationId: string;
  partySize: number;
  dateTime: Date;
};

export async function createReservationFromConversation(
  conversation: {
    id: string;
    waId: string;
    restaurantId: string | null;
    language: string;
    context: unknown;
  },
  deps: { prisma: PrismaClient },
): Promise<CreateReservationResult | null> {
  if (!conversation.restaurantId) return null;

  const ctx = parseContext(conversation.context) as ConversationContext;
  if (!ctx.pendingReservation) return null;

  const restaurantId = conversation.restaurantId;
  const pending = ctx.pendingReservation;

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

  const dateTime = new Date(pending.dateTimeIso);
  const reservation = await deps.prisma.reservation.create({
    data: {
      restaurantId,
      customerId: customer.id,
      dateTime,
      partySize: pending.partySize,
      status: "REQUESTED",
    },
  });

  const cleared: ConversationContext = {
    ...ctx,
    pendingReservation: undefined,
    reservation: undefined,
  };

  await deps.prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      context: cleared as import("@prisma/client").Prisma.InputJsonValue,
      state: "START",
    },
  });

  const customerLabel = customer.name?.trim() || conversation.waId;

  await enqueueSheetJob(deps.prisma, restaurantId, {
    kind: "RESERVATION_APPEND",
    reservation: {
      createdAt: reservation.createdAt,
      customerLabel,
      dateTime,
      partySize: pending.partySize,
      status: "REQUESTED",
      reservationId: reservation.id,
    },
  });
  scheduleSheetOutboxDrain(deps.prisma);

  void notifyStaffNewReservation({
    prisma: deps.prisma,
    restaurantName: restaurant.name,
    phoneWhatsappNotify: restaurant.phoneWhatsappNotify,
    customerLabel,
    dateTime,
    partySize: pending.partySize,
  }).catch((error) => {
    logger.warn("staff_reservation_notify_failed", {
      reservationId: reservation.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info("reservation_created", {
    reservationId: reservation.id,
    restaurantId,
    partySize: pending.partySize,
  });

  return {
    reservationId: reservation.id,
    partySize: pending.partySize,
    dateTime,
  };
}

export async function notifyStaffNewReservation(input: {
  prisma: PrismaClient;
  restaurantName: string;
  phoneWhatsappNotify: string | null | undefined;
  customerLabel: string;
  dateTime: Date;
  partySize: number;
}): Promise<{ ok: boolean; via: "session" | "template" | "skipped" }> {
  if (!input.phoneWhatsappNotify) {
    return { ok: true, via: "skipped" };
  }

  const text = buildStaffReservationMessage({
    restaurantName: input.restaurantName,
    customerLabel: input.customerLabel,
    dateTime: input.dateTime,
    partySize: input.partySize,
  });

  const staffConv = await input.prisma.conversation.findUnique({
    where: { waId: input.phoneWhatsappNotify.replace(/\D/g, "") },
    select: { lastInboundAt: true },
  });

  if (isSessionActive({ lastInboundAt: staffConv?.lastInboundAt ?? null })) {
    const result = await sendSessionText(input.phoneWhatsappNotify, text);
    if (result.ok) return { ok: true, via: "session" };
  }

  const templateResult = await sendTemplate(
    input.phoneWhatsappNotify,
    process.env.WATI_STAFF_RESERVATION_TEMPLATE ?? "staff_new_reservation",
    {
      restaurant: input.restaurantName,
      customer: input.customerLabel,
      when: input.dateTime.toISOString(),
      party_size: String(input.partySize),
    },
  );

  return { ok: templateResult.ok, via: "template" };
}
