import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyWatiWebhookOrigin } from "@/lib/webhooks/wati/auth";
import {
  claimWatiWebhookEvent,
  processClaimedWatiEvent,
} from "@/lib/webhooks/wati/process";
import { checkRateLimit } from "@/lib/webhooks/wati/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.unknown();

/**
 * WATI inbound webhook.
 * 1. Verify origin + rate-limit
 * 2. Persist WebhookEvent (idempotent)
 * 3. Return 200 immediately
 * 4. Process conversation in `after()`
 */
export async function POST(request: Request): Promise<Response> {
  const auth = verifyWatiWebhookOrigin(request);
  if (!auth.ok) {
    logger.warn("wati_webhook_unauthorized", { reason: auth.reason });
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const limit = checkRateLimit(`wati-webhook:${ip}`, {
    limit: Number(process.env.WATI_WEBHOOK_RATE_LIMIT ?? 120),
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    logger.warn("wati_webhook_rate_limited", { ip, retryAfterMs: limit.retryAfterMs });
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)),
        },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = bodySchema.parse(await request.json());
  } catch {
    logger.warn("wati_webhook_invalid_json");
    return NextResponse.json({ ok: true, status: "ignored", reason: "invalid_json" });
  }

  let claimResult;
  try {
    claimResult = await claimWatiWebhookEvent(rawBody, { prisma });
  } catch (error) {
    logger.error("wati_webhook_claim_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: true, status: "error" });
  }

  logger.info("wati_webhook_claim", {
    status: claimResult.status,
    eventId: "eventId" in claimResult ? claimResult.eventId : undefined,
    reason: "reason" in claimResult ? claimResult.reason : undefined,
    ip,
  });

  if (claimResult.status === "claimed") {
    const claimed = claimResult;
    after(async () => {
      try {
        const processed = await processClaimedWatiEvent(claimed, { prisma });
        logger.info("wati_webhook_processed", processed);
      } catch (error) {
        logger.error("wati_webhook_process_failed", {
          eventId: claimed.eventId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  return NextResponse.json({
    ok: true,
    status: claimResult.status,
    eventId: "eventId" in claimResult ? claimResult.eventId : undefined,
    reason: "reason" in claimResult ? claimResult.reason : undefined,
  });
}
