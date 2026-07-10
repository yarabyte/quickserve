const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SessionConversation = {
  lastInboundAt: Date | null;
};

/** WhatsApp session window: interactive messages allowed within 24h of last inbound. */
export function isSessionActive(conversation: SessionConversation): boolean {
  if (!conversation.lastInboundAt) {
    return false;
  }

  return Date.now() - conversation.lastInboundAt.getTime() < SESSION_WINDOW_MS;
}

export const WATI_SESSION_WINDOW_MS = SESSION_WINDOW_MS;
