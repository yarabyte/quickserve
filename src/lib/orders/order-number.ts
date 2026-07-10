/** Readable order number, e.g. CD-CHEZ-A3F9K2 */
export function generateOrderNumber(restaurantSlug: string): string {
  const slugPart = restaurantSlug
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase() || "QS";
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const day = new Date().toISOString().slice(5, 10).replace("-", "");
  return `CD-${slugPart}-${day}${rand}`;
}
