import { timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies webhook origin when WATI_WEBHOOK_SECRET is set.
 * Accepts:
 * - Header `x-wati-webhook-secret`
 * - Header `Authorization: Bearer <secret>`
 * - Query `?secret=`
 *
 * If the secret env is unset (local/dev), requests are allowed with a warning.
 */
export function verifyWatiWebhookOrigin(request: Request): {
  ok: boolean;
  reason?: string;
} {
  const expected = process.env.WATI_WEBHOOK_SECRET?.trim();

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      logger.error("wati_webhook_secret_missing");
      return { ok: false, reason: "webhook_secret_not_configured" };
    }
    logger.warn("wati_webhook_secret_unset_dev_allow");
    return { ok: true };
  }

  const headerSecret = request.headers.get("x-wati-webhook-secret");
  if (headerSecret && safeEqual(headerSecret, expected)) {
    return { ok: true };
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token && safeEqual(token, expected)) {
      return { ok: true };
    }
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret && safeEqual(querySecret, expected)) {
    return { ok: true };
  }

  return { ok: false, reason: "invalid_webhook_secret" };
}
