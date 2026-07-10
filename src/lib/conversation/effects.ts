import {
  isSessionActive,
  sendInteractiveButtons,
  sendInteractiveList,
  sendSessionText,
  sendTemplate,
} from "@/lib/wati/client";
import { logger } from "@/lib/logger";
import { t, normalizeLanguage } from "@/i18n";
import type { ConversationSnapshot, OutboundEffect } from "@/types/conversation";

export type ApplyEffectsDeps = {
  sendText?: typeof sendSessionText;
  sendButtons?: typeof sendInteractiveButtons;
  sendList?: typeof sendInteractiveList;
  sendTemplateMsg?: typeof sendTemplate;
};

/**
 * Apply WATI outbound effects.
 * Hors session 24h : envoie un template approuvé au lieu des messages interactifs.
 */
export async function applyOutboundEffects(
  conversation: ConversationSnapshot,
  effects: OutboundEffect[],
  deps: ApplyEffectsDeps = {},
): Promise<void> {
  const sendText = deps.sendText ?? sendSessionText;
  const sendButtons = deps.sendButtons ?? sendInteractiveButtons;
  const sendList = deps.sendList ?? sendInteractiveList;
  const sendTemplateMsg = deps.sendTemplateMsg ?? sendTemplate;

  const sessionOk = isSessionActive({ lastInboundAt: conversation.lastInboundAt });
  const lang = normalizeLanguage(conversation.language);

  if (!sessionOk) {
    const templateName =
      process.env.WATI_SESSION_EXPIRED_TEMPLATE ?? "session_reopen";
    const result = await sendTemplateMsg(conversation.waId, templateName, {
      notice: t("session_expired_notice", lang),
      restaurant: conversation.restaurantId ?? "",
    });
    if (!result.ok) {
      // Last resort: attempt plain text (may fail outside window)
      await sendText(conversation.waId, t("session_expired_notice", lang));
      logger.warn("wati_session_expired_template_failed", {
        waId: conversation.waId,
        error: result.error,
      });
    } else {
      logger.info("wati_session_expired_template_sent", {
        waId: conversation.waId,
        templateName,
      });
    }
    return;
  }

  for (const effect of effects) {
    let result;
    switch (effect.type) {
      case "send_text":
        result = await sendText(conversation.waId, effect.text);
        break;
      case "send_buttons":
        result = await sendButtons(conversation.waId, effect.payload);
        break;
      case "send_list":
        result = await sendList(conversation.waId, effect.payload);
        break;
      case "send_template":
        result = await sendTemplateMsg(
          conversation.waId,
          effect.templateName,
          effect.params,
        );
        break;
      default: {
        const _exhaustive: never = effect;
        throw new Error(`Unknown effect: ${JSON.stringify(_exhaustive)}`);
      }
    }

    if (!result.ok) {
      logger.error("wati_effect_failed", {
        waId: conversation.waId,
        effectType: effect.type,
        error: result.error,
      });
    }
  }
}

export function welcomeNoRestaurantMessage(language: string): string {
  return t("welcome_no_restaurant", language);
}
