import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";
import { syncMenu } from "@/lib/menu/sync";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/restaurants/:restaurantId/menu/resync
 * Isolation via withTenant(session).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const session = await auth();
  const { restaurantId } = await context.params;

  try {
    const result = await withTenant(
      session,
      async () => syncMenu(restaurantId, { prisma }),
      { restaurantId },
    );
    logger.info("menu_resync_api", { restaurantId, ...result });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("menu_resync_api_failed", {
      restaurantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "resync_failed",
      },
      { status: 401 },
    );
  }
}
