import { describe, expect, it } from "vitest";

import { BUTTON, handleInput } from "./machine";
import { categoryRowId, itemRowId } from "./menu";
import type {
  MachineConversation,
  MenuItemView,
  RestaurantView,
} from "@/types/conversation-machine";
import type { ConversationInput } from "@/types/conversation";

const restaurant: RestaurantView = {
  id: "resto-1",
  slug: "chez-douala",
  name: "Chez Douala",
  isOpen: true,
  defaultLanguage: "fr",
  currency: "XAF",
};

const menu: MenuItemView[] = [
  {
    externalRef: "sheet-row-1",
    categoryName: "Plats",
    name: "Poulet DG",
    description: "Classique",
    priceXAF: 3500,
    isAvailable: true,
    position: 1,
  },
  {
    externalRef: "sheet-row-2",
    categoryName: "Plats",
    name: "Ndolé",
    description: null,
    priceXAF: 3000,
    isAvailable: true,
    position: 2,
  },
  {
    externalRef: "sheet-row-4",
    categoryName: "Boissons",
    name: "Jus de bissap",
    description: null,
    priceXAF: 500,
    isAvailable: true,
    position: 4,
  },
];

function conv(
  partial: Partial<MachineConversation> = {},
): MachineConversation {
  return {
    id: "c1",
    waId: "237600000001",
    restaurantId: restaurant.id,
    state: "START",
    language: "fr",
    context: { items: [] },
    ...partial,
  };
}

function input(value: string, kind: ConversationInput["kind"] = "button"): ConversationInput {
  return { kind, value };
}

function step(
  conversation: MachineConversation,
  value: string,
  kind: ConversationInput["kind"] = "button",
) {
  const outcome = handleInput(conversation, restaurant, input(value, kind), menu);
  return {
    outcome,
    next: conv({
      state: outcome.nextState,
      language: outcome.language,
      context: outcome.context,
    }),
  };
}

describe("handleInput — parcours commande livraison", () => {
  it("parcourt START → menu → panier → livraison → confirmation", () => {
    let current = conv();

    // Accueil
    let s = step(current, "bonjour", "text");
    expect(s.outcome.nextState).toBe("START");
    expect(s.outcome.effects.some((e) => e.type === "send_buttons")).toBe(true);
    current = s.next;

    // Commander → catégories
    s = step(current, BUTTON.ORDER);
    expect(s.outcome.nextState).toBe("BROWSING_MENU");
    const catList = s.outcome.effects.find((e) => e.type === "send_list");
    expect(catList?.type).toBe("send_list");
    if (catList?.type === "send_list") {
      expect(catList.payload.sections[0]?.rows.map((r) => r.id)).toContain(
        categoryRowId("Plats"),
      );
    }
    current = s.next;

    // Catégorie Plats → items
    s = step(current, categoryRowId("Plats"), "list");
    expect(s.outcome.nextState).toBe("BROWSING_MENU");
    expect(s.outcome.context.browse).toMatchObject({
      mode: "items",
      category: "Plats",
    });
    current = s.next;

    // Sélection Poulet DG → panier
    s = step(current, itemRowId("sheet-row-1"), "list");
    expect(s.outcome.nextState).toBe("CART");
    expect(s.outcome.context.items).toEqual([{ menuItemRef: "sheet-row-1", qty: 1 }]);
    expect(
      s.outcome.effects.some(
        (e) => e.type === "send_text" && e.text.includes("Poulet DG"),
      ),
    ).toBe(true);
    current = s.next;

    // Valider → service
    s = step(current, BUTTON.CART_CHECKOUT);
    expect(s.outcome.nextState).toBe("CHOOSING_SERVICE");
    current = s.next;

    // Livraison → adresse
    s = step(current, BUTTON.SERVICE_DELIVERY);
    expect(s.outcome.nextState).toBe("COLLECTING_ADDRESS");
    current = s.next;

    // Adresse libre
    s = step(current, "Rue de la Joie, Douala", "text");
    expect(s.outcome.nextState).toBe("ORDER_SUMMARY");
    expect(s.outcome.context.deliveryAddress).toBe("Rue de la Joie, Douala");
    expect(s.outcome.context.serviceType).toBe("DELIVERY");
    const summary = s.outcome.effects.find((e) => e.type === "send_text");
    expect(summary?.type === "send_text" && summary.text).toContain("3500");
    current = s.next;

    // Confirmer
    s = step(current, BUTTON.ORDER_CONFIRM);
    expect(s.outcome.nextState).toBe("ORDER_CONFIRMED");
    expect(s.outcome.context.items).toEqual([]);
    expect(s.outcome.context.pendingOrder).toMatchObject({
      type: "DELIVERY",
      totalXAF: 3500,
      deliveryAddress: "Rue de la Joie, Douala",
      items: [{ menuItemRef: "sheet-row-1", name: "Poulet DG", qty: 1, unitPriceXAF: 3500 }],
    });
    expect(
      s.outcome.effects.some(
        (e) => e.type === "send_text" && e.text.includes("confirmée"),
      ),
    ).toBe(true);
  });

  it("ajoute plusieurs plats et calcule le total", () => {
    let current = conv({ state: "BROWSING_MENU", context: { items: [], browse: { mode: "items", category: "Plats", page: 1 } } });

    let s = step(current, itemRowId("sheet-row-1"), "list");
    current = s.next;
    // Remettre en browsing pour 2e item
    s = step(current, BUTTON.CART_ADD);
    current = s.next;
    s = step(current, categoryRowId("Boissons"), "list");
    current = s.next;
    s = step(current, itemRowId("sheet-row-4"), "list");

    expect(s.outcome.context.items).toEqual([
      { menuItemRef: "sheet-row-1", qty: 1 },
      { menuItemRef: "sheet-row-4", qty: 1 },
    ]);
    expect(s.outcome.nextState).toBe("CART");
  });
});

describe("handleInput — parcours réservation", () => {
  it("parcourt date → taille → confirmation", () => {
    let current = conv();

    let s = step(current, BUTTON.RESERVE);
    expect(s.outcome.nextState).toBe("RESERVATION_DATE");
    current = s.next;

    s = step(current, "pas une date", "text");
    expect(s.outcome.nextState).toBe("RESERVATION_DATE");
    expect(
      s.outcome.effects.some((e) => e.type === "send_text" && e.text.includes("invalide")),
    ).toBe(true);
    current = s.next;

    s = step(current, "2026-07-20 19:30", "text");
    expect(s.outcome.nextState).toBe("RESERVATION_PARTYSIZE");
    expect(s.outcome.context.reservation?.dateTimeIso).toBeTruthy();
    current = s.next;

    s = step(current, "99", "text");
    expect(s.outcome.nextState).toBe("RESERVATION_PARTYSIZE");
    current = s.next;

    s = step(current, "4", "text");
    expect(s.outcome.nextState).toBe("RESERVATION_CONFIRM");
    expect(s.outcome.context.reservation?.partySize).toBe(4);
    current = s.next;

    s = step(current, BUTTON.RES_CONFIRM);
    expect(s.outcome.nextState).toBe("START");
    expect(s.outcome.context.pendingReservation).toMatchObject({
      partySize: 4,
    });
    expect(s.outcome.context.reservation).toBeUndefined();
    expect(
      s.outcome.effects.some(
        (e) => e.type === "send_text" && e.text.includes("enregistrée"),
      ),
    ).toBe(true);
  });
});

describe("handleInput — langue", () => {
  it("bascule FR → EN et revient à START", () => {
    let current = conv({ language: "fr" });
    let s = step(current, BUTTON.LANG);
    expect(s.outcome.nextState).toBe("CHOOSING_LANGUAGE");
    current = s.next;

    s = step(current, BUTTON.LANG_EN);
    expect(s.outcome.language).toBe("en");
    expect(s.outcome.nextState).toBe("START");
    expect(
      s.outcome.effects.some((e) => e.type === "send_text" && e.text.includes("English")),
    ).toBe(true);
  });
});
