import { normalizeWaId } from "@/lib/wati/payloads";
import type { ConversationInput } from "@/types/conversation";

import type { WatiInboundParsed } from "./schema";

/**
 * WATI often puts an opaque id in buttonReply.payload and the label in .text.
 * Prefer our stable ids (intent_*, cat:*, item:*, …); otherwise use the visible title.
 */
function pickButtonValue(
  reply:
    | {
        payload?: string;
        id?: string;
        text?: string;
        title?: string;
      }
    | null
    | undefined,
): string | null {
  if (!reply) return null;
  const payload = reply.payload?.trim() || reply.id?.trim() || "";
  const label = reply.text?.trim() || reply.title?.trim() || "";

  if (payload) {
    const looksStable =
      /^(intent_|lang_|cart_|service_|order_|res_|menu_|nav_|cat:|item:|__)/i.test(
        payload,
      );
    if (looksStable) return payload;
    // Opaque WATI/WhatsApp id → use label if present
    if (label) return label;
    return payload;
  }

  return label || null;
}

export function extractNormalizedInput(
  message: WatiInboundParsed,
): ConversationInput | null {
  const senderName = message.senderName ?? null;

  // Prefer stable row id (cat:/item:); else title (WATI may send opaque ids)
  const listRawId = message.listReply?.id?.trim() || "";
  const listTitle = message.listReply?.title?.trim() || "";
  const listId = listRawId
    ? /^(cat:|item:)/i.test(listRawId)
      ? listRawId
      : listTitle || listRawId
    : listTitle;
  if (listId) {
    return {
      kind: "list",
      value: listId,
      rawText: message.listReply?.title ?? undefined,
      senderName,
    };
  }

  const interactiveId = pickButtonValue(message.interactiveButtonReply);
  if (interactiveId) {
    return {
      kind: "button",
      value: interactiveId,
      rawText:
        message.interactiveButtonReply?.title ??
        message.interactiveButtonReply?.text ??
        undefined,
      senderName,
    };
  }

  const buttonPayload = pickButtonValue(message.buttonReply);
  if (buttonPayload) {
    return {
      kind: "button",
      value: buttonPayload,
      rawText: message.buttonReply?.text ?? message.buttonReply?.title ?? undefined,
      senderName,
    };
  }

  const text = message.text?.trim();
  if (text) {
    return {
      kind: "text",
      value: text,
      rawText: text,
      senderName,
    };
  }

  return null;
}

export function extractWaId(message: WatiInboundParsed): string {
  return normalizeWaId(message.waId);
}

export const RESTO_SLUG_RE = /^RESTO-([a-z0-9-]+)$/i;

export function parseRestoSlug(value: string): string | null {
  const match = value.trim().match(RESTO_SLUG_RE);
  return match?.[1]?.toLowerCase() ?? null;
}
