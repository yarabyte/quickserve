import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Daily cron: TRIAL with trialEndsAt < now → SUSPENDED.
 * Protect with CRON_SECRET (Authorization: Bearer … or ?secret=).
 *
 * Vercel Cron: see vercel.json + docs in README.
 */
export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    logger.error("cron_secret_missing");
    return NextResponse.json({ ok: false, error: "cron_not_configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (bearer !== expected && querySecret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await prisma.restaurant.updateMany({
    where: {
      subscriptionStatus: "TRIAL",
      trialEndsAt: { lt: now },
    },
    data: { subscriptionStatus: "SUSPENDED" },
  });

  logger.info("cron_subscriptions_ran", { suspended: result.count, at: now.toISOString() });

  return NextResponse.json({
    ok: true,
    suspended: result.count,
    at: now.toISOString(),
  });
}
