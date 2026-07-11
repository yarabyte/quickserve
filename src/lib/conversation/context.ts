import type {
  CartItem,
  ConversationContext,
  MenuItemView,
} from "@/types/conversation-machine";

export function emptyContext(): ConversationContext {
  return { items: [] };
}

export function parseContext(raw: unknown): ConversationContext {
  if (!raw || typeof raw !== "object") {
    return emptyContext();
  }

  const obj = raw as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? obj.items
        .map((item): CartItem | null => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (typeof row.menuItemRef !== "string") return null;
          const qty = typeof row.qty === "number" && row.qty > 0 ? Math.floor(row.qty) : 1;
          return { menuItemRef: row.menuItemRef, qty };
        })
        .filter((x): x is CartItem => x !== null)
    : [];

  return {
    ...(obj as ConversationContext),
    items,
  };
}

export function mergeContext(
  base: ConversationContext,
  patch: Partial<ConversationContext>,
): ConversationContext {
  return {
    ...base,
    ...patch,
    items: patch.items ?? base.items,
    browse: Object.prototype.hasOwnProperty.call(patch, "browse")
      ? patch.browse
      : base.browse,
    pendingMenuItemRef: Object.prototype.hasOwnProperty.call(patch, "pendingMenuItemRef")
      ? patch.pendingMenuItemRef
      : base.pendingMenuItemRef,
    reservation: Object.prototype.hasOwnProperty.call(patch, "reservation")
      ? patch.reservation
      : base.reservation,
    pendingOrder: Object.prototype.hasOwnProperty.call(patch, "pendingOrder")
      ? patch.pendingOrder
      : base.pendingOrder,
    pendingReservation: Object.prototype.hasOwnProperty.call(patch, "pendingReservation")
      ? patch.pendingReservation
      : base.pendingReservation,
    serviceType: Object.prototype.hasOwnProperty.call(patch, "serviceType")
      ? patch.serviceType
      : base.serviceType,
    deliveryAddress: Object.prototype.hasOwnProperty.call(patch, "deliveryAddress")
      ? patch.deliveryAddress
      : base.deliveryAddress,
  };
}

export function addToCart(items: CartItem[], menuItemRef: string, qty = 1): CartItem[] {
  const next = items.map((i) => ({ ...i }));
  const existing = next.find((i) => i.menuItemRef === menuItemRef);
  if (existing) {
    existing.qty += qty;
    return next;
  }
  next.push({ menuItemRef, qty });
  return next;
}

export function cartTotalXAF(items: CartItem[], menu: MenuItemView[]): number {
  return items.reduce((sum, item) => {
    const menuItem = menu.find((m) => m.externalRef === item.menuItemRef);
    return sum + (menuItem?.priceXAF ?? 0) * item.qty;
  }, 0);
}

export function resolveCartLines(
  items: CartItem[],
  menu: MenuItemView[],
): Array<{ menuItemRef: string; name: string; qty: number; unitPriceXAF: number; subtotal: number }> {
  return items.map((item) => {
    const menuItem = menu.find((m) => m.externalRef === item.menuItemRef);
    const unitPriceXAF = menuItem?.priceXAF ?? 0;
    return {
      menuItemRef: item.menuItemRef,
      name: menuItem?.name ?? item.menuItemRef,
      qty: item.qty,
      unitPriceXAF,
      subtotal: unitPriceXAF * item.qty,
    };
  });
}

export const LIST_PAGE_SIZE = 10;
