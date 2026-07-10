import type { Conversation, Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { runConversationEngine } from "@/lib/conversation/engine";
import {
  applyOutboundEffects,
  type ApplyEffectsDeps,
} from "@/lib/conversation/effects";
import { getMenu } from "@/lib/menu/sync";
import { createOrderFromConversation } from "@/lib/orders/create";
import { createReservationFromConversation } from "@/lib/reservations/create";
import { logger } from "@/lib/logger";
import type { ConversationInput, ConversationSnapshot, ConversationTransition } from "@/types/conversation";
import type { MenuItemView, RestaurantView } from "@/types/conversation-machine";
import { parseContext } from "@/lib/conversation/context";
import type { ConversationContext } from "@/types/conversation-machine";

import { extractNormalizedInput, extractWaId, parseRestoSlug } from "./input";
import {
  isInboundClientMessage,
  normalizeWebhookMessage,
  watiWebhookPayloadSchema,
  type WatiInboundParsed,
} from "./schema";

export type ProcessWatiWebhookResult =
  | { status: "ignored"; reason: string }
  | { status: "duplicate"; eventId: string }
  | { status: "claimed"; eventId: string; waId: string; message: WatiInboundParsed; input: ConversationInput }
  | { status: "processed"; eventId: string; waId: string }
  | { status: "invalid"; reason: string };

export type ProcessWatiWebhookDeps = {
  prisma: PrismaClient;
  applyEffects?: typeof applyOutboundEffects;
  runEngine?: (
    conversation: ConversationSnapshot,
    input: ConversationInput,
    restaurant: RestaurantView,
    menu: MenuItemView[],
  ) => ConversationTransition;
  getMenuFn?: typeof getMenu;
  now?: () => Date;
} & ApplyEffectsDeps;

function toSnapshot(conversation: Conversation): ConversationSnapshot {
  return {
    id: conversation.id,
    waId: conversation.waId,
    restaurantId: conversation.restaurantId,
    state: conversation.state,
    context: conversation.context,
    language: conversation.language,
    lastInboundAt: conversation.lastInboundAt,
  };
}

async function claimWebhookEvent(
  prisma: PrismaClient,
  eventId: string,
  payload: unknown,
): Promise<"claimed" | "duplicate"> {
  try {
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        payload: payload as Prisma.InputJsonValue,
        processedAt: null,
      },
    });
    return "claimed";
  } catch (error) {
    if (
      error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "duplicate";
    }
    throw error;
  }
}

async function markProcessed(prisma: PrismaClient, eventId: string, at: Date): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { processedAt: at },
  });
}

async function loadOrCreateConversation(
  prisma: PrismaClient,
  waId: string,
  now: Date,
): Promise<Conversation> {
  const existing = await prisma.conversation.findUnique({ where: { waId } });
  if (existing) {
    return prisma.conversation.update({
      where: { id: existing.id },
      data: { lastInboundAt: now },
    });
  }

  return prisma.conversation.create({
    data: {
      waId,
      state: "INIT",
      context: {},
      language: "fr",
      lastInboundAt: now,
    },
  });
}

async function resolveTenant(
  prisma: PrismaClient,
  conversation: Conversation,
  input: ConversationInput,
): Promise<{ conversation: Conversation; linked: boolean; unknownSlug: boolean }> {
  const slug = parseRestoSlug(input.value);
  if (!slug) {
    return { conversation, linked: false, unknownSlug: false };
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    logger.warn("wati_tenant_slug_unknown", { slug, waId: conversation.waId });
    return { conversation, linked: false, unknownSlug: true };
  }

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      restaurantId: restaurant.id,
      state: conversation.restaurantId === restaurant.id ? conversation.state : "INIT",
    },
  });

  logger.info("wati_tenant_linked", {
    waId: conversation.waId,
    restaurantId: restaurant.id,
    slug,
  });

  return { conversation: updated, linked: true, unknownSlug: false };
}

/**
 * Parse + validate + claim WebhookEvent (idempotent insert).
 * Does not run the conversation engine — call `processClaimedWatiEvent` after ACK.
 */
export async function claimWatiWebhookEvent(
  rawBody: unknown,
  deps: Pick<ProcessWatiWebhookDeps, "prisma">,
): Promise<ProcessWatiWebhookResult> {
  const parsed = watiWebhookPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    logger.warn("wati_webhook_invalid_payload", {
      issues: parsed.error.issues.slice(0, 5),
    });
    return { status: "invalid", reason: "invalid_payload" };
  }

  const message = normalizeWebhookMessage(parsed.data);
  if (!message) {
    return { status: "ignored", reason: "no_message" };
  }

  if (!isInboundClientMessage(message)) {
    logger.info("wati_webhook_ignored_non_inbound", {
      eventId: message.id,
      eventType: message.eventType,
      statusString: message.statusString,
    });
    return { status: "ignored", reason: "non_inbound" };
  }

  const input = extractNormalizedInput(message);
  if (!input) {
    logger.info("wati_webhook_ignored_empty_input", { eventId: message.id });
    return { status: "ignored", reason: "empty_input" };
  }

  const claim = await claimWebhookEvent(deps.prisma, message.id, rawBody);
  if (claim === "duplicate") {
    logger.info("wati_webhook_duplicate", { eventId: message.id });
    return { status: "duplicate", eventId: message.id };
  }

  const waId = extractWaId(message);
  return { status: "claimed", eventId: message.id, waId, message, input };
}

export async function processClaimedWatiEvent(
  claimed: Extract<ProcessWatiWebhookResult, { status: "claimed" }>,
  deps: ProcessWatiWebhookDeps,
): Promise<Extract<ProcessWatiWebhookResult, { status: "processed" }>> {
  const now = deps.now?.() ?? new Date();
  const runEngine = deps.runEngine ?? runConversationEngine;
  const applyEffects = deps.applyEffects ?? applyOutboundEffects;
  const { input, waId, eventId } = claimed;

  let conversation = await loadOrCreateConversation(deps.prisma, waId, now);

  const tenant = await resolveTenant(deps.prisma, conversation, input);
  conversation = tenant.conversation;

  if (!conversation.restaurantId) {
    const { t } = await import("@/i18n");
    const text = tenant.unknownSlug
      ? t("restaurant_not_found", conversation.language)
      : t("welcome_no_restaurant", conversation.language);

    await applyEffects(toSnapshot(conversation), [{ type: "send_text", text }], deps);
    await markProcessed(deps.prisma, eventId, now);
    return { status: "processed", eventId, waId };
  }

  const engineInput: ConversationInput = tenant.linked
    ? { kind: "text", value: "__tenant_linked__", senderName: input.senderName }
    : input;

  const restaurantRow = await deps.prisma.restaurant.findUniqueOrThrow({
    where: { id: conversation.restaurantId },
  });

  const { evaluateSubscription } = await import("@/lib/tenant/subscription");
  const gate = evaluateSubscription(restaurantRow, now);
  if (!gate.active) {
    const text =
      conversation.language === "en" ? gate.messageEn : gate.messageFr;
    await applyEffects(toSnapshot(conversation), [{ type: "send_text", text }], deps);
    await markProcessed(deps.prisma, eventId, now);
    return { status: "processed", eventId, waId };
  }

  const restaurant: RestaurantView = {
    id: restaurantRow.id,
    slug: restaurantRow.slug,
    name: restaurantRow.name,
    isOpen: restaurantRow.isOpen,
    defaultLanguage: restaurantRow.defaultLanguage,
    currency: restaurantRow.currency,
  };

  const getMenuFn = deps.getMenuFn ?? getMenu;
  const menu = await getMenuFn(restaurant.id, deps.prisma);

  const snapshot = toSnapshot(conversation);
  const transition = runEngine(snapshot, engineInput, restaurant, menu);

  const updateData: Prisma.ConversationUpdateInput = {};
  if (transition.nextState) updateData.state = transition.nextState;
  if (transition.nextContext) {
    updateData.context = transition.nextContext as Prisma.InputJsonValue;
  }
  if (transition.nextLanguage) updateData.language = transition.nextLanguage;
  if (transition.restaurantId !== undefined) {
    updateData.restaurant = transition.restaurantId
      ? { connect: { id: transition.restaurantId } }
      : { disconnect: true };
  }

  let nextConversation = conversation;
  if (Object.keys(updateData).length > 0) {
    nextConversation = await deps.prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
    });
  }

  // Persistence side-effects (Order / Reservation) — Sheets via outbox (non-blocking).
  await persistDomainEffects(deps.prisma, nextConversation);

  // Reload after persistence may have cleared pending* from context
  const refreshed = await deps.prisma.conversation.findUniqueOrThrow({
    where: { id: nextConversation.id },
  });

  await applyEffects(toSnapshot(refreshed), transition.effects, deps);
  await markProcessed(deps.prisma, eventId, now);

  return { status: "processed", eventId, waId };
}

async function persistDomainEffects(
  prisma: PrismaClient,
  conversation: Conversation,
): Promise<void> {
  const ctx = parseContext(conversation.context) as ConversationContext;

  if (ctx.pendingOrder) {
    await createOrderFromConversation(conversation, { prisma });
  }

  if (ctx.pendingReservation) {
    // Re-read in case order path mutated context
    const latest = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    await createReservationFromConversation(latest, { prisma });
  }
}

/**
 * Full pipeline (claim + process). Useful for tests and sync callers.
 */
export async function processWatiWebhook(
  rawBody: unknown,
  deps: ProcessWatiWebhookDeps,
): Promise<ProcessWatiWebhookResult> {
  const claimed = await claimWatiWebhookEvent(rawBody, deps);
  if (claimed.status !== "claimed") {
    return claimed;
  }

  try {
    return await processClaimedWatiEvent(claimed, deps);
  } catch (error) {
    logger.error("wati_webhook_process_failed", {
      eventId: claimed.eventId,
      waId: claimed.waId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
