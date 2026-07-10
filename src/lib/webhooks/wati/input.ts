import { normalizeWaId } from "@/lib/wati/payloads";
import type { ConversationInput } from "@/types/conversation";

import type { WatiInboundParsed } from "./schema";

export function extractNormalizedInput(
  message: WatiInboundParsed,
): ConversationInput | null {
  const senderName = message.senderName ?? null;

  const listId = message.listReply?.id?.trim();
  if (listId) {
    return {
      kind: "list",
      value: listId,
      rawText: message.listReply?.title ?? undefined,
      senderName,
    };
  }

  const interactiveId =
    message.interactiveButtonReply?.id?.trim() ||
    message.interactiveButtonReply?.payload?.trim();
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

  const buttonPayload =
    message.buttonReply?.payload?.trim() ||
    message.buttonReply?.id?.trim();
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
