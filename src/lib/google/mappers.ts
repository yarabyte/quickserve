export type OrderSheetSource = {
  orderNumber: string;
  createdAt: Date;
  customerLabel: string;
  type: "DELIVERY" | "PICKUP";
  itemsSummary: string;
  totalXAF: number;
  deliveryAddress?: string | null;
  paymentMethod?: string | null;
  status: string;
};

export type ReservationSheetSource = {
  createdAt: Date;
  customerLabel: string;
  dateTime: Date;
  partySize: number;
  status: string;
  note?: string | null;
  reservationId: string;
};

/** Commandes columns: Date | N°Commande | Client | Type | Articles | TotalFCFA | Adresse | Paiement | Statut */
export function orderToSheetRow(order: OrderSheetSource): string[] {
  return [
    formatSheetDate(order.createdAt),
    order.orderNumber,
    order.customerLabel,
    order.type === "DELIVERY" ? "Livraison" : "À emporter",
    order.itemsSummary,
    String(order.totalXAF),
    order.deliveryAddress ?? "",
    order.paymentMethod ?? "CASH",
    order.status,
  ];
}

/** Reservations columns: DateCréation | Id | Client | DateHeure | Couverts | Statut | Note */
export function reservationToSheetRow(reservation: ReservationSheetSource): string[] {
  return [
    formatSheetDate(reservation.createdAt),
    reservation.reservationId,
    reservation.customerLabel,
    formatSheetDate(reservation.dateTime),
    String(reservation.partySize),
    reservation.status,
    reservation.note ?? "",
  ];
}

export function formatItemsSummary(
  items: Array<{ name: string; qty: number; unitPriceXAF?: number }>,
): string {
  return items.map((item) => `${item.name} x${item.qty}`).join(", ");
}

export function formatSheetDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function buildStaffOrderMessage(input: {
  restaurantName: string;
  orderNumber: string;
  type: "DELIVERY" | "PICKUP";
  customerLabel: string;
  itemsSummary: string;
  totalXAF: number;
  deliveryAddress?: string | null;
}): string {
  const lines = [
    `🍽️ Nouvelle commande — ${input.restaurantName}`,
    `N° ${input.orderNumber}`,
    `Type : ${input.type === "DELIVERY" ? "Livraison" : "À emporter"}`,
    `Client : ${input.customerLabel}`,
    `Articles : ${input.itemsSummary}`,
    `Total : ${input.totalXAF} FCFA`,
  ];
  if (input.type === "DELIVERY" && input.deliveryAddress) {
    lines.push(`Adresse : ${input.deliveryAddress}`);
  }
  lines.push("Paiement : CASH (en attente)");
  return lines.join("\n");
}

export function buildStaffReservationMessage(input: {
  restaurantName: string;
  customerLabel: string;
  dateTime: Date;
  partySize: number;
}): string {
  return [
    `📅 Nouvelle réservation — ${input.restaurantName}`,
    `Client : ${input.customerLabel}`,
    `Quand : ${formatSheetDate(input.dateTime)}`,
    `Couverts : ${input.partySize}`,
  ].join("\n");
}
