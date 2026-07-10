import type { Prisma, PrismaClient } from "@prisma/client";

import { logger } from "@/lib/logger";

import { getSheetsClient, type SheetsClient } from "./sheets";
import type { OrderSheetSource, ReservationSheetSource } from "./mappers";

export type SheetOutboxKind =
  | "ORDER_APPEND"
  | "RESERVATION_APPEND"
  | "ORDER_STATUS";

export type SheetOutboxPayload =
  | { kind: "ORDER_APPEND"; order: OrderSheetSource }
  | { kind: "RESERVATION_APPEND"; reservation: ReservationSheetSource }
  | { kind: "ORDER_STATUS"; orderNumber: string; status: string };

export async function enqueueSheetJob(
  prisma: PrismaClient,
  restaurantId: string,
  payload: SheetOutboxPayload,
): Promise<void> {
  await prisma.sheetOutbox.create({
    data: {
      restaurantId,
      kind: payload.kind,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
}

function backoffMs(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6));
}

/**
 * Process pending SheetOutbox jobs. Safe to call fire-and-forget after order confirm.
 * Failures stay in the queue for later retry — never throws to the caller path.
 */
export async function processSheetOutbox(
  prisma: PrismaClient,
  options: {
    limit?: number;
    sheets?: SheetsClient;
    now?: Date;
  } = {},
): Promise<{ processed: number; failed: number }> {
  const sheets = options.sheets ?? getSheetsClient();
  const now = options.now ?? new Date();
  const limit = options.limit ?? 10;

  const jobs = await prisma.sheetOutbox.findMany({
    where: {
      processedAt: null,
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: job.restaurantId },
      select: { googleSpreadsheetId: true },
    });

    const spreadsheetId = restaurant?.googleSpreadsheetId;
    if (!spreadsheetId || spreadsheetId.startsWith("demo-")) {
      await prisma.sheetOutbox.update({
        where: { id: job.id },
        data: {
          processedAt: now,
          lastError: "no_spreadsheet_configured",
        },
      });
      processed += 1;
      continue;
    }

    try {
      const payload = job.payload as SheetOutboxPayload;
      if (payload.kind === "ORDER_APPEND") {
        await sheets.appendOrderRow(spreadsheetId, payload.order);
      } else if (payload.kind === "RESERVATION_APPEND") {
        await sheets.appendReservationRow(spreadsheetId, payload.reservation);
      } else if (payload.kind === "ORDER_STATUS") {
        await sheets.updateOrderStatusRow(
          spreadsheetId,
          payload.orderNumber,
          payload.status,
        );
      }

      await prisma.sheetOutbox.update({
        where: { id: job.id },
        data: { processedAt: now, lastError: null },
      });
      processed += 1;
    } catch (error) {
      failed += 1;
      const attempts = job.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);
      await prisma.sheetOutbox.update({
        where: { id: job.id },
        data: {
          attempts,
          lastError: message.slice(0, 500),
          nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
        },
      });
      logger.warn("sheet_outbox_job_failed", {
        jobId: job.id,
        kind: job.kind,
        attempts,
        error: message,
      });
    }
  }

  return { processed, failed };
}

/** Fire-and-forget drain — never blocks the customer confirmation path. */
export function scheduleSheetOutboxDrain(prisma: PrismaClient): void {
  void processSheetOutbox(prisma).catch((error) => {
    logger.error("sheet_outbox_drain_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
