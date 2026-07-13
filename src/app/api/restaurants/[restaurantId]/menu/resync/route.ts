import { NextResponse } from "next/server";

/**
 * POST /api/restaurants/:restaurantId/menu/resync
 * @deprecated Menus are edited in the dashboard — Sheets sync removed.
 */
export async function POST(): Promise<Response> {
  return NextResponse.json(
    {
      ok: false,
      error: "menu_managed_in_dashboard",
      message: "Le menu se gère dans le dashboard, plus via Google Sheets.",
    },
    { status: 410 },
  );
}
