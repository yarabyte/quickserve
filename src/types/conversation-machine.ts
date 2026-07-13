export type ConversationLanguage = "fr" | "en";

export type ConversationState =
  | "INIT"
  | "START"
  | "CHOOSING_LANGUAGE"
  | "BROWSING_MENU"
  | "COLLECTING_QTY"
  | "CART"
  | "CHOOSING_SERVICE"
  | "COLLECTING_ADDRESS"
  | "ORDER_SUMMARY"
  | "ORDER_CONFIRMED"
  | "RESERVATION_DATE"
  | "RESERVATION_PARTYSIZE"
  | "RESERVATION_CONFIRM";

export type CartItem = {
  menuItemRef: string;
  qty: number;
};

export type OrderServiceType = "DELIVERY" | "PICKUP";

export type BrowseMode = "categories" | "items";

export type ConversationContext = {
  items: CartItem[];
  serviceType?: OrderServiceType;
  deliveryAddress?: string;
  /** Item selected, waiting for quantity (1–3) — optional after default qty=1 */
  pendingMenuItemRef?: string;
  /** Last dish added — used to adjust qty via free-text number in CART */
  lastAddedRef?: string;
  browse?: {
    mode: BrowseMode;
    category?: string;
    page: number;
  };
  reservation?: {
    dateTimeIso?: string;
    partySize?: number;
  };
  /** Snapshot used by the route to persist Order / Reservation */
  pendingOrder?: {
    type: OrderServiceType;
    items: Array<{
      menuItemRef: string;
      name: string;
      qty: number;
      unitPriceXAF: number;
    }>;
    totalXAF: number;
    deliveryAddress?: string;
  };
  pendingReservation?: {
    dateTimeIso: string;
    partySize: number;
  };
};

export type MenuItemView = {
  externalRef: string;
  categoryName: string;
  name: string;
  description: string | null;
  /** Public https image URL shown when the guest picks this dish */
  imageUrl: string | null;
  priceXAF: number;
  isAvailable: boolean;
  position: number;
};

export type RestaurantView = {
  id: string;
  slug: string;
  name: string;
  isOpen: boolean;
  defaultLanguage: string;
  currency: string;
};

export type MachineConversation = {
  id: string;
  waId: string;
  restaurantId: string | null;
  state: string;
  language: string;
  context: unknown;
};

export type MachineResult = {
  nextState: ConversationState;
  contextPatch: Partial<ConversationContext>;
  /** Full merged context after patch (convenience for callers/tests) */
  context: ConversationContext;
  language: ConversationLanguage;
  effects: import("@/types/conversation").OutboundEffect[];
};
