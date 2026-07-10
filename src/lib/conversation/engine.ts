import type {
  ConversationInput,
  ConversationSnapshot,
  ConversationTransition,
} from "@/types/conversation";
import type { MenuItemView, RestaurantView } from "@/types/conversation-machine";

import { handleInput } from "./machine";

/**
 * Adapter used by the webhook route.
 * Pure: menu + restaurant must already be loaded (MenuItemCache).
 */
export function runConversationEngine(
  conversation: ConversationSnapshot,
  input: ConversationInput,
  restaurant: RestaurantView,
  menu: MenuItemView[],
): ConversationTransition {
  const outcome = handleInput(
    {
      id: conversation.id,
      waId: conversation.waId,
      restaurantId: conversation.restaurantId,
      state: conversation.state,
      language: conversation.language,
      context: conversation.context,
    },
    restaurant,
    input,
    menu,
  );

  return {
    nextState: outcome.nextState,
    nextContext: outcome.context,
    nextLanguage: outcome.language,
    effects: outcome.effects,
  };
}
