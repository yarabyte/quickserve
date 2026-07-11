import { normalizeLanguage, t } from "@/i18n";
import type { OutboundEffect } from "@/types/conversation";
import type {
  ConversationContext,
  ConversationLanguage,
  ConversationState,
  MachineConversation,
  MachineResult,
  MenuItemView,
  RestaurantView,
} from "@/types/conversation-machine";
import type { ConversationInput } from "@/types/conversation";

import {
  addToCart,
  cartTotalXAF,
  emptyContext,
  mergeContext,
  parseContext,
  resolveCartLines,
} from "./context";
import {
  categoryRowId,
  itemRowId,
  itemsInCategory,
  listCategories,
  paginate,
  parseCategoryRowId,
  parseItemRowId,
} from "./menu";

export const BUTTON = {
  ORDER: "intent_order",
  RESERVE: "intent_reserve",
  LANG: "intent_lang",
  LANG_FR: "lang_fr",
  LANG_EN: "lang_en",
  CART_ADD: "cart_add",
  CART_CHECKOUT: "cart_checkout",
  CART_CLEAR: "cart_clear",
  SERVICE_DELIVERY: "service_delivery",
  SERVICE_PICKUP: "service_pickup",
  ORDER_CONFIRM: "order_confirm",
  ORDER_CANCEL: "order_cancel",
  RES_CONFIRM: "res_confirm",
  RES_CANCEL: "res_cancel",
  MENU_PREV: "menu_page_prev",
  MENU_NEXT: "menu_page_next",
  HOME: "nav_home",
} as const;

/** Map WATI button titles / aliases → stable button ids */
export function normalizeButtonValue(value: string): string {
  const v = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const aliases: Record<string, string> = {
    [BUTTON.ORDER]: BUTTON.ORDER,
    commander: BUTTON.ORDER,
    order: BUTTON.ORDER,
    [BUTTON.RESERVE]: BUTTON.RESERVE,
    reserver: BUTTON.RESERVE,
    reserve: BUTTON.RESERVE,
    [BUTTON.LANG]: BUTTON.LANG,
    langue: BUTTON.LANG,
    language: BUTTON.LANG,
    [BUTTON.LANG_FR]: BUTTON.LANG_FR,
    francais: BUTTON.LANG_FR,
    [BUTTON.LANG_EN]: BUTTON.LANG_EN,
    english: BUTTON.LANG_EN,
    [BUTTON.CART_ADD]: BUTTON.CART_ADD,
    ajouter: BUTTON.CART_ADD,
    "add more": BUTTON.CART_ADD,
    [BUTTON.CART_CHECKOUT]: BUTTON.CART_CHECKOUT,
    valider: BUTTON.CART_CHECKOUT,
    checkout: BUTTON.CART_CHECKOUT,
    [BUTTON.CART_CLEAR]: BUTTON.CART_CLEAR,
    vider: BUTTON.CART_CLEAR,
    clear: BUTTON.CART_CLEAR,
    [BUTTON.SERVICE_DELIVERY]: BUTTON.SERVICE_DELIVERY,
    livraison: BUTTON.SERVICE_DELIVERY,
    delivery: BUTTON.SERVICE_DELIVERY,
    [BUTTON.SERVICE_PICKUP]: BUTTON.SERVICE_PICKUP,
    "a emporter": BUTTON.SERVICE_PICKUP,
    pickup: BUTTON.SERVICE_PICKUP,
    [BUTTON.ORDER_CONFIRM]: BUTTON.ORDER_CONFIRM,
    [BUTTON.RES_CONFIRM]: BUTTON.RES_CONFIRM,
    confirmer: BUTTON.ORDER_CONFIRM,
    confirm: BUTTON.ORDER_CONFIRM,
    [BUTTON.ORDER_CANCEL]: BUTTON.ORDER_CANCEL,
    [BUTTON.RES_CANCEL]: BUTTON.RES_CANCEL,
    annuler: BUTTON.ORDER_CANCEL,
    cancel: BUTTON.ORDER_CANCEL,
    [BUTTON.HOME]: BUTTON.HOME,
    retour: BUTTON.HOME,
    home: BUTTON.HOME,
  };
  return aliases[v] ?? value.trim();
}

const ESTIMATED_ETA_MIN = 35;

function buttons(
  body: string,
  items: Array<{ id: string; title: string }>,
): OutboundEffect {
  return {
    type: "send_buttons",
    payload: { body, buttons: items.slice(0, 3) },
  };
}

function text(body: string): OutboundEffect {
  return { type: "send_text", text: body };
}

function result(
  nextState: ConversationState,
  ctx: ConversationContext,
  patch: Partial<ConversationContext>,
  language: ConversationLanguage,
  effects: OutboundEffect[],
): MachineResult {
  const merged = mergeContext(ctx, patch);
  return {
    nextState,
    contextPatch: patch,
    context: merged,
    language,
    effects,
  };
}

function startButtons(lang: ConversationLanguage, restaurantName: string): OutboundEffect {
  return buttons(t("welcome", lang, { name: restaurantName }), [
    { id: BUTTON.ORDER, title: t("btn_order", lang) },
    { id: BUTTON.RESERVE, title: t("btn_reserve", lang) },
    { id: BUTTON.LANG, title: t("btn_lang", lang) },
  ]);
}

function goStart(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  extraEffects: OutboundEffect[] = [],
): MachineResult {
  const patch: Partial<ConversationContext> = {
    browse: undefined,
    pendingOrder: undefined,
    pendingReservation: undefined,
  };
  return result("START", ctx, patch, lang, [...extraEffects, startButtons(lang, restaurant.name)]);
}

function buildCategoriesList(
  lang: ConversationLanguage,
  menu: MenuItemView[],
): OutboundEffect | null {
  const categories = listCategories(menu);
  if (categories.length === 0) return null;

  const page = paginate(categories, 1);
  return {
    type: "send_list",
    payload: {
      header: t("menu_categories_header", lang),
      body: t("menu_categories_body", lang),
      button: t("menu_categories_button", lang),
      sections: [
        {
          title: t("menu_categories_header", lang),
          rows: page.slice.map((category) => ({
            id: categoryRowId(category),
            title: category.slice(0, 24),
          })),
        },
      ],
    },
  };
}

function buildItemsList(
  lang: ConversationLanguage,
  menu: MenuItemView[],
  category: string,
  pageNum: number,
): { effect: OutboundEffect; page: number; pages: number } | null {
  const items = itemsInCategory(menu, category);
  if (items.length === 0) return null;

  const page = paginate(items, pageNum);
  const rows = page.slice.map((item) => ({
    id: itemRowId(item.externalRef),
    title: item.name.slice(0, 24),
    description: `${item.priceXAF} FCFA`.slice(0, 72),
  }));

  // WhatsApp max 10 rows — reserve slots for pagination nav via buttons after list if needed
  return {
    page: page.page,
    pages: page.pages,
    effect: {
      type: "send_list",
      payload: {
        header: t("menu_items_header", lang, { category: category.slice(0, 60) }),
        body: t("menu_items_body", lang, { page: page.page, pages: page.pages }),
        button: t("menu_items_button", lang),
        sections: [{ title: category.slice(0, 24), rows }],
      },
    },
  };
}

function paginationButtons(
  lang: ConversationLanguage,
  page: number,
  pages: number,
): OutboundEffect | null {
  if (pages <= 1) return null;
  const btns: Array<{ id: string; title: string }> = [];
  if (page > 1) btns.push({ id: BUTTON.MENU_PREV, title: t("menu_page_prev", lang) });
  if (page < pages) btns.push({ id: BUTTON.MENU_NEXT, title: t("menu_page_next", lang) });
  btns.push({ id: BUTTON.HOME, title: t("back_home", lang) });
  return buttons(t("menu_items_body", lang, { page, pages }), btns.slice(0, 3));
}

function cartEffects(
  lang: ConversationLanguage,
  ctx: ConversationContext,
  menu: MenuItemView[],
): OutboundEffect[] {
  if (ctx.items.length === 0) {
    return [
      text(t("cart_empty", lang)),
      buttons(t("unknown", lang), [
        { id: BUTTON.ORDER, title: t("btn_order", lang) },
        { id: BUTTON.HOME, title: t("back_home", lang) },
      ]),
    ];
  }

  const lines = resolveCartLines(ctx.items, menu);
  const linesText = lines
    .map((line) =>
      t("cart_line", lang, {
        name: line.name,
        qty: line.qty,
        subtotal: line.subtotal,
      }),
    )
    .join("\n");
  const total = cartTotalXAF(ctx.items, menu);

  return [
    text(t("cart_header", lang, { lines: linesText, total })),
    buttons(t("btn_checkout", lang), [
      { id: BUTTON.CART_ADD, title: t("btn_add_item", lang) },
      { id: BUTTON.CART_CHECKOUT, title: t("btn_checkout", lang) },
      { id: BUTTON.CART_CLEAR, title: t("btn_clear_cart", lang) },
    ]),
  ];
}

function orderSummaryEffects(
  lang: ConversationLanguage,
  ctx: ConversationContext,
  menu: MenuItemView[],
): OutboundEffect[] {
  const lines = resolveCartLines(ctx.items, menu);
  const linesText = lines
    .map((line) =>
      t("cart_line", lang, {
        name: line.name,
        qty: line.qty,
        subtotal: line.subtotal,
      }),
    )
    .join("\n");
  const total = cartTotalXAF(ctx.items, menu);
  const service =
    ctx.serviceType === "DELIVERY"
      ? t("service_delivery", lang)
      : t("service_pickup", lang);
  const address =
    ctx.serviceType === "DELIVERY" && ctx.deliveryAddress
      ? t("address_line", lang, { address: ctx.deliveryAddress })
      : "";

  return [
    text(
      t("order_summary", lang, {
        service,
        lines: linesText,
        total,
        address,
      }),
    ),
    buttons(t("btn_confirm", lang), [
      { id: BUTTON.ORDER_CONFIRM, title: t("btn_confirm", lang) },
      { id: BUTTON.ORDER_CANCEL, title: t("btn_cancel", lang) },
    ]),
  ];
}

function parseReservationDate(value: string): string | null {
  const trimmed = value.trim();
  // Accept ISO-like "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/,
  );
  if (!match) return null;
  const [, date, hourRaw, minute] = match;
  const hour = hourRaw.padStart(2, "0");
  const iso = `${date}T${hour}:${minute}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatReservationDate(iso: string, lang: ConversationLanguage): string {
  const d = new Date(iso);
  return d.toLocaleString(lang === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeState(state: string): ConversationState {
  if (state === "INIT" || state === "AWAITING_INTENT" || !state) return "START";
  return state as ConversationState;
}

/**
 * Pure deterministic conversation state machine.
 * No I/O — menu must be provided by the caller (from MenuItemCache).
 */
export function handleInput(
  conversation: MachineConversation,
  restaurant: RestaurantView,
  input: ConversationInput,
  menu: MenuItemView[],
): MachineResult {
  const lang = normalizeLanguage(conversation.language);
  const ctx = parseContext(conversation.context);
  const state = normalizeState(conversation.state);
  const value = normalizeButtonValue(input.value.trim());

  if (!restaurant.isOpen && state === "START" && value === BUTTON.ORDER) {
    return goStart(ctx, lang, restaurant, [text(t("closed", lang, { name: restaurant.name }))]);
  }

  // Global home
  if (value === BUTTON.HOME) {
    return goStart(ctx, lang, restaurant);
  }

  switch (state) {
    case "START":
      return handleStart(ctx, lang, restaurant, menu, value);
    case "CHOOSING_LANGUAGE":
      return handleChoosingLanguage(ctx, lang, restaurant, value);
    case "BROWSING_MENU":
      return handleBrowsingMenu(ctx, lang, restaurant, menu, value);
    case "CART":
      return handleCart(ctx, lang, restaurant, menu, value);
    case "CHOOSING_SERVICE":
      return handleChoosingService(ctx, lang, menu, value);
    case "COLLECTING_ADDRESS":
      return handleCollectingAddress(ctx, lang, menu, value);
    case "ORDER_SUMMARY":
      return handleOrderSummary(ctx, lang, restaurant, menu, value);
    case "ORDER_CONFIRMED":
      return goStart(ctx, lang, restaurant);
    case "RESERVATION_DATE":
      return handleReservationDate(ctx, lang, value);
    case "RESERVATION_PARTYSIZE":
      return handleReservationPartySize(ctx, lang, value);
    case "RESERVATION_CONFIRM":
      return handleReservationConfirm(ctx, lang, restaurant, value);
    default:
      return goStart(ctx, lang, restaurant, [text(t("unknown", lang))]);
  }
}

function handleStart(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  if (value === BUTTON.ORDER || value === "__tenant_linked__") {
    if (value === "__tenant_linked__") {
      return goStart(ctx, lang, restaurant);
    }
    const list = buildCategoriesList(lang, menu);
    if (!list) {
      return result("START", ctx, {}, lang, [
        text(t("menu_empty", lang)),
        startButtons(lang, restaurant.name),
      ]);
    }
    return result(
      "BROWSING_MENU",
      ctx,
      { browse: { mode: "categories", page: 1 } },
      lang,
      [list],
    );
  }

  if (value === BUTTON.RESERVE) {
    return result("RESERVATION_DATE", ctx, { reservation: {} }, lang, [
      text(t("ask_reservation_date", lang)),
    ]);
  }

  if (value === BUTTON.LANG) {
    return result("CHOOSING_LANGUAGE", ctx, {}, lang, [
      buttons(t("choose_language", lang), [
        { id: BUTTON.LANG_FR, title: t("btn_fr", lang) },
        { id: BUTTON.LANG_EN, title: t("btn_en", lang) },
      ]),
    ]);
  }

  // First visit / free text → show welcome
  return goStart(ctx, lang, restaurant);
}

function handleChoosingLanguage(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  value: string,
): MachineResult {
  const nextLang: ConversationLanguage =
    value === BUTTON.LANG_EN ? "en" : value === BUTTON.LANG_FR ? "fr" : lang;

  const switched = result(
    "START",
    ctx,
    {},
    nextLang,
    [text(t("lang_switched", nextLang)), startButtons(nextLang, restaurant.name)],
  );
  return switched;
}

/**
 * Resolve category from list row id (`cat:…`) or plain title ("Plats").
 * WATI sometimes delivers only the row title without the custom id.
 */
function resolveCategorySelection(value: string, menu: MenuItemView[]): string | null {
  const fromId = parseCategoryRowId(value);
  if (fromId) return fromId;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return listCategories(menu).find((c) => c.toLowerCase() === normalized) ?? null;
}

function resolveItemSelection(
  value: string,
  menu: MenuItemView[],
  category?: string,
): MenuItemView | null {
  const fromId = parseItemRowId(value);
  if (fromId) {
    return menu.find((m) => m.externalRef === fromId) ?? null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const pool = category ? itemsInCategory(menu, category) : menu;
  return pool.find((m) => m.name.toLowerCase() === normalized) ?? null;
}

function handleBrowsingMenu(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  const categoryFromList = resolveCategorySelection(value, menu);
  if (categoryFromList) {
    const built = buildItemsList(lang, menu, categoryFromList, 1);
    if (!built) {
      return result("BROWSING_MENU", ctx, { browse: { mode: "categories", page: 1 } }, lang, [
        text(t("menu_empty", lang)),
      ]);
    }
    const effects: OutboundEffect[] = [built.effect];
    const nav = paginationButtons(lang, built.page, built.pages);
    if (nav) effects.push(nav);
    return result(
      "BROWSING_MENU",
      ctx,
      { browse: { mode: "items", category: categoryFromList, page: built.page } },
      lang,
      effects,
    );
  }

  const browseCategory =
    ctx.browse?.mode === "items" ? ctx.browse.category : undefined;
  const menuItem = resolveItemSelection(value, menu, browseCategory);
  if (menuItem) {
    const items = addToCart(ctx.items, menuItem.externalRef, 1);
    const nextCtx = mergeContext(ctx, { items });
    const qty = items.find((i) => i.menuItemRef === menuItem.externalRef)?.qty ?? 1;
    return result("CART", ctx, { items, browse: undefined }, lang, [
      text(t("item_added", lang, { name: menuItem.name, qty })),
      ...cartEffects(lang, nextCtx, menu),
    ]);
  }

  if (value === BUTTON.MENU_NEXT || value === BUTTON.MENU_PREV) {
    const browse = ctx.browse;
    if (!browse || browse.mode !== "items" || !browse.category) {
      const list = buildCategoriesList(lang, menu);
      return result(
        "BROWSING_MENU",
        ctx,
        { browse: { mode: "categories", page: 1 } },
        lang,
        list ? [list] : [text(t("menu_empty", lang))],
      );
    }
    const delta = value === BUTTON.MENU_NEXT ? 1 : -1;
    const built = buildItemsList(lang, menu, browse.category, browse.page + delta);
    if (!built) {
      return goStart(ctx, lang, restaurant, [text(t("menu_empty", lang))]);
    }
    const effects: OutboundEffect[] = [built.effect];
    const nav = paginationButtons(lang, built.page, built.pages);
    if (nav) effects.push(nav);
    return result(
      "BROWSING_MENU",
      ctx,
      { browse: { mode: "items", category: browse.category, page: built.page } },
      lang,
      effects,
    );
  }

  if (value === BUTTON.ORDER) {
    const list = buildCategoriesList(lang, menu);
    return result(
      "BROWSING_MENU",
      ctx,
      { browse: { mode: "categories", page: 1 } },
      lang,
      list ? [list] : [text(t("menu_empty", lang))],
    );
  }

  return goStart(ctx, lang, restaurant, [text(t("unknown", lang))]);
}

function handleCart(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  if (value === BUTTON.CART_ADD) {
    const list = buildCategoriesList(lang, menu);
    return result(
      "BROWSING_MENU",
      ctx,
      { browse: { mode: "categories", page: 1 } },
      lang,
      list ? [list] : [text(t("menu_empty", lang))],
    );
  }

  if (value === BUTTON.CART_CLEAR) {
    return result("START", ctx, { items: [] }, lang, [
      text(t("cart_cleared", lang)),
      startButtons(lang, restaurant.name),
    ]);
  }

  if (value === BUTTON.CART_CHECKOUT) {
    if (ctx.items.length === 0) {
      return result("CART", ctx, {}, lang, cartEffects(lang, ctx, menu));
    }
    return result("CHOOSING_SERVICE", ctx, {}, lang, [
      buttons(t("choose_service", lang), [
        { id: BUTTON.SERVICE_DELIVERY, title: t("btn_delivery", lang) },
        { id: BUTTON.SERVICE_PICKUP, title: t("btn_pickup", lang) },
      ]),
    ]);
  }

  return result("CART", ctx, {}, lang, [
    text(t("unknown", lang)),
    ...cartEffects(lang, ctx, menu),
  ]);
}

function handleChoosingService(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  if (value === BUTTON.SERVICE_DELIVERY) {
    return result(
      "COLLECTING_ADDRESS",
      ctx,
      { serviceType: "DELIVERY" },
      lang,
      [text(t("ask_address", lang))],
    );
  }

  if (value === BUTTON.SERVICE_PICKUP) {
    const patch: Partial<ConversationContext> = {
      serviceType: "PICKUP",
      deliveryAddress: undefined,
    };
    const next = mergeContext(ctx, patch);
    return result("ORDER_SUMMARY", ctx, patch, lang, orderSummaryEffects(lang, next, menu));
  }

  return result("CHOOSING_SERVICE", ctx, {}, lang, [
    buttons(t("choose_service", lang), [
      { id: BUTTON.SERVICE_DELIVERY, title: t("btn_delivery", lang) },
      { id: BUTTON.SERVICE_PICKUP, title: t("btn_pickup", lang) },
    ]),
  ]);
}

function handleCollectingAddress(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  if (!value || value.startsWith("intent_") || value.startsWith("service_")) {
    return result("COLLECTING_ADDRESS", ctx, {}, lang, [text(t("ask_address", lang))]);
  }

  const patch: Partial<ConversationContext> = {
    deliveryAddress: value,
    serviceType: "DELIVERY",
  };
  const next = mergeContext(ctx, patch);
  return result("ORDER_SUMMARY", ctx, patch, lang, orderSummaryEffects(lang, next, menu));
}

function handleOrderSummary(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  menu: MenuItemView[],
  value: string,
): MachineResult {
  if (value === BUTTON.ORDER_CANCEL) {
    return result("BROWSING_MENU", ctx, { serviceType: undefined, deliveryAddress: undefined }, lang, [
      text(t("order_cancelled", lang)),
      buildCategoriesList(lang, menu) ?? text(t("menu_empty", lang)),
    ]);
  }

  if (value === BUTTON.ORDER_CONFIRM) {
    const lines = resolveCartLines(ctx.items, menu);
    const total = cartTotalXAF(ctx.items, menu);
    const serviceType = ctx.serviceType ?? "PICKUP";
    const pendingOrder = {
      type: serviceType,
      items: lines.map((l) => ({
        menuItemRef: l.menuItemRef,
        name: l.name,
        qty: l.qty,
        unitPriceXAF: l.unitPriceXAF,
      })),
      totalXAF: total,
      deliveryAddress: serviceType === "DELIVERY" ? ctx.deliveryAddress : undefined,
    };

    return result(
      "ORDER_CONFIRMED",
      ctx,
      {
        pendingOrder,
        items: [],
        serviceType: undefined,
        deliveryAddress: undefined,
        browse: undefined,
      },
      lang,
      [
        text(
          t("order_confirmed", lang, {
            total,
            eta: ESTIMATED_ETA_MIN,
          }),
        ),
        startButtons(lang, restaurant.name),
      ],
    );
  }

  return result("ORDER_SUMMARY", ctx, {}, lang, orderSummaryEffects(lang, ctx, menu));
}

function handleReservationDate(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  value: string,
): MachineResult {
  const iso = parseReservationDate(value);
  if (!iso) {
    return result("RESERVATION_DATE", ctx, {}, lang, [text(t("invalid_date", lang))]);
  }
  return result(
    "RESERVATION_PARTYSIZE",
    ctx,
    { reservation: { ...ctx.reservation, dateTimeIso: iso } },
    lang,
    [text(t("ask_party_size", lang))],
  );
}

function handleReservationPartySize(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  value: string,
): MachineResult {
  const size = Number.parseInt(value, 10);
  if (!Number.isFinite(size) || size < 1 || size > 20) {
    return result("RESERVATION_PARTYSIZE", ctx, {}, lang, [
      text(t("invalid_party_size", lang)),
    ]);
  }

  const dateTimeIso = ctx.reservation?.dateTimeIso;
  if (!dateTimeIso) {
    return result("RESERVATION_DATE", ctx, { reservation: {} }, lang, [
      text(t("ask_reservation_date", lang)),
    ]);
  }

  return result(
    "RESERVATION_CONFIRM",
    ctx,
    { reservation: { dateTimeIso, partySize: size } },
    lang,
    [
      text(
        t("reservation_summary", lang, {
          date: formatReservationDate(dateTimeIso, lang),
          size,
        }),
      ),
      buttons(t("btn_confirm", lang), [
        { id: BUTTON.RES_CONFIRM, title: t("btn_confirm", lang) },
        { id: BUTTON.RES_CANCEL, title: t("btn_cancel", lang) },
      ]),
    ],
  );
}

function handleReservationConfirm(
  ctx: ConversationContext,
  lang: ConversationLanguage,
  restaurant: RestaurantView,
  value: string,
): MachineResult {
  if (value === BUTTON.RES_CANCEL) {
    return result("START", ctx, { reservation: undefined, pendingReservation: undefined }, lang, [
      text(t("reservation_cancelled", lang)),
      startButtons(lang, restaurant.name),
    ]);
  }

  if (value === BUTTON.RES_CONFIRM) {
    const dateTimeIso = ctx.reservation?.dateTimeIso;
    const partySize = ctx.reservation?.partySize;
    if (!dateTimeIso || !partySize) {
      return result("RESERVATION_DATE", ctx, { reservation: {} }, lang, [
        text(t("ask_reservation_date", lang)),
      ]);
    }

    return result(
      "START",
      ctx,
      {
        pendingReservation: { dateTimeIso, partySize },
        reservation: undefined,
      },
      lang,
      [
        text(
          t("reservation_confirmed", lang, {
            date: formatReservationDate(dateTimeIso, lang),
            size: partySize,
          }),
        ),
        startButtons(lang, restaurant.name),
      ],
    );
  }

  const dateTimeIso = ctx.reservation?.dateTimeIso;
  const partySize = ctx.reservation?.partySize;
  if (!dateTimeIso || !partySize) {
    return result("RESERVATION_DATE", ctx, {}, lang, [text(t("ask_reservation_date", lang))]);
  }

  return result("RESERVATION_CONFIRM", ctx, {}, lang, [
    text(
      t("reservation_summary", lang, {
        date: formatReservationDate(dateTimeIso, lang),
        size: partySize,
      }),
    ),
    buttons(t("btn_confirm", lang), [
      { id: BUTTON.RES_CONFIRM, title: t("btn_confirm", lang) },
      { id: BUTTON.RES_CANCEL, title: t("btn_cancel", lang) },
    ]),
  ]);
}

export { emptyContext, parseContext, mergeContext };
