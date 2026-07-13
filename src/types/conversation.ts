import type { Conversation } from "@prisma/client";

import type {
  WatiSendInteractiveButtonsInput,
  WatiSendInteractiveListInput,
  WatiTemplateParams,
} from "@/types/wati";

export type ConversationInputKind = "text" | "button" | "list";

export type ConversationInput = {
  kind: ConversationInputKind;
  /** Normalized value: free text, buttonReply.payload, or listReply.id */
  value: string;
  rawText?: string;
  senderName?: string | null;
};

export type OutboundEffect =
  | { type: "send_text"; text: string }
  | { type: "send_buttons"; payload: WatiSendInteractiveButtonsInput }
  | { type: "send_list"; payload: WatiSendInteractiveListInput }
  | { type: "send_image"; url: string; caption?: string }
  | {
      type: "send_template";
      templateName: string;
      params: WatiTemplateParams;
    };

export type ConversationTransition = {
  nextState?: string;
  nextContext?: Record<string, unknown>;
  nextLanguage?: string;
  restaurantId?: string | null;
  effects: OutboundEffect[];
};

export type ConversationSnapshot = Pick<
  Conversation,
  "id" | "waId" | "restaurantId" | "state" | "context" | "language" | "lastInboundAt"
>;
