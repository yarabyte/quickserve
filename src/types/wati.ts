/** Types for inbound WATI webhook payloads (message received). */

export type WatiMessageType =
  | "text"
  | "button"
  | "interactive"
  | "image"
  | "document"
  | "location"
  | "voice"
  | "audio"
  | "video"
  | "sticker"
  | "contacts"
  | "reaction"
  | "order"
  | "catalog"
  | "media_placeholder";

export type WatiEventType = "message" | string;

export interface WatiButtonReply {
  payload: string;
  text: string;
}

export interface WatiListReply {
  id: string;
  title: string;
  description?: string;
}

export interface WatiInteractiveButtonReply {
  id: string;
  title: string;
}

/** Flat inbound message shape used by QuickServe (WATI "message received" event). */
export interface WatiInboundMessage {
  id: string;
  waId: string;
  senderName?: string | null;
  text?: string | null;
  type: WatiMessageType;
  buttonReply?: WatiButtonReply | null;
  listReply?: WatiListReply | null;
  interactiveButtonReply?: WatiInteractiveButtonReply | null;
  replyContextId?: string | null;
  timestamp?: string | null;
  eventType: WatiEventType;
  conversationId?: string | null;
  whatsappMessageId?: string | null;
}

/** Raw webhook body — WATI may send the message object directly or wrapped. */
export interface WatiWebhookPayload {
  eventType?: WatiEventType;
  message?: WatiInboundMessage;
  waId?: string;
  id?: string;
  text?: string | null;
  type?: WatiMessageType;
  senderName?: string | null;
  buttonReply?: WatiButtonReply | null;
  listReply?: WatiListReply | null;
  interactiveButtonReply?: WatiInteractiveButtonReply | null;
  replyContextId?: string | null;
  timestamp?: string | null;
}

export type WatiSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export type WatiInteractiveButton = {
  id: string;
  title: string;
};

export type WatiInteractiveListRow = {
  id: string;
  title: string;
  description?: string;
};

export type WatiInteractiveListSection = {
  title: string;
  rows: WatiInteractiveListRow[];
};

export type WatiSendInteractiveButtonsInput = {
  body: string;
  buttons: WatiInteractiveButton[];
  header?: string;
  footer?: string;
};

export type WatiSendInteractiveListInput = {
  header: string;
  body: string;
  button: string;
  sections: WatiInteractiveListSection[];
  footer?: string;
};

export type WatiTemplateParams = Record<string, string>;
