import { z } from "zod";

const watiMessageTypeSchema = z.enum([
  "text",
  "button",
  "interactive",
  "image",
  "document",
  "location",
  "voice",
  "audio",
  "video",
  "sticker",
  "contacts",
  "reaction",
  "order",
  "catalog",
  "media_placeholder",
]);

const buttonReplySchema = z
  .object({
    payload: z.string().optional(),
    text: z.string().optional(),
    id: z.string().optional(),
    title: z.string().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const listReplySchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

/** Flat WATI inbound message (message-received webhook). */
export const watiInboundMessageSchema = z
  .object({
    id: z.string().min(1),
    waId: z.string().min(1),
    senderName: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    type: watiMessageTypeSchema.or(z.string()),
    buttonReply: buttonReplySchema,
    listReply: listReplySchema,
    interactiveButtonReply: buttonReplySchema,
    replyContextId: z.string().nullable().optional(),
    timestamp: z.union([z.string(), z.number()]).nullable().optional(),
    eventType: z.string().optional(),
    conversationId: z.string().nullable().optional(),
    whatsappMessageId: z.string().nullable().optional(),
    statusString: z.string().nullable().optional(),
    owner: z.boolean().optional(),
  })
  .passthrough();

export type WatiInboundParsed = z.infer<typeof watiInboundMessageSchema>;

/** Accepts either a flat message object or a lightly wrapped payload. */
export const watiWebhookPayloadSchema = z
  .object({
    eventType: z.string().optional(),
    message: watiInboundMessageSchema.optional(),
    id: z.string().optional(),
    waId: z.string().optional(),
    senderName: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    type: watiMessageTypeSchema.or(z.string()).optional(),
    buttonReply: buttonReplySchema,
    listReply: listReplySchema,
    interactiveButtonReply: buttonReplySchema,
    replyContextId: z.string().nullable().optional(),
    timestamp: z.union([z.string(), z.number()]).nullable().optional(),
    conversationId: z.string().nullable().optional(),
    whatsappMessageId: z.string().nullable().optional(),
    statusString: z.string().nullable().optional(),
    owner: z.boolean().optional(),
  })
  .passthrough();

export type WatiWebhookParsed = z.infer<typeof watiWebhookPayloadSchema>;

const STATUS_EVENT_TYPES = new Set([
  "sent",
  "delivered",
  "read",
  "failed",
  "messageStatus",
  "status",
  "templateMessageSent",
]);

const STATUS_STRINGS = new Set(["SENT", "DELIVERED", "READ", "FAILED", "PENDING"]);

export function normalizeWebhookMessage(
  payload: WatiWebhookParsed,
): WatiInboundParsed | null {
  if (payload.message) {
    return payload.message;
  }

  if (payload.id && payload.waId && payload.type) {
    const result = watiInboundMessageSchema.safeParse(payload);
    return result.success ? result.data : null;
  }

  return null;
}

/** Keep only inbound client messages; drop delivery/read status events. */
export function isInboundClientMessage(message: WatiInboundParsed): boolean {
  if (message.owner === true) {
    return false;
  }

  const eventType = (message.eventType ?? "").toLowerCase();
  if (STATUS_EVENT_TYPES.has(eventType) || STATUS_EVENT_TYPES.has(eventType.replace(/_/g, ""))) {
    return false;
  }

  if (message.statusString && STATUS_STRINGS.has(message.statusString.toUpperCase())) {
    // Status webhooks often reuse the message shape with statusString set and no useful text/reply.
    const hasContent =
      Boolean(message.text?.trim()) ||
      Boolean(message.buttonReply) ||
      Boolean(message.listReply) ||
      Boolean(message.interactiveButtonReply);
    if (!hasContent && eventType !== "message") {
      return false;
    }
  }

  // Explicit status event types from WATI
  if (eventType.includes("status") || eventType.includes("delivered") || eventType.includes("read")) {
    return false;
  }

  return eventType === "" || eventType === "message";
}
