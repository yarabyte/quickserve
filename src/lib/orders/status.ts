import type { OrderStatus, PrismaClient } from "@prisma/client";

import { enqueueSheetJob, scheduleSheetOutboxDrain } from "@/lib/google/queue";
import { logger } from "@/lib/logger";

/**
 * Dashboard status change: Postgres first, then Sheets status column (async outbox).
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  deps: { prisma: PrismaClient },
): Promise<{ orderNumber: string; status: OrderStatus }> {
  const order = await deps.prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  await enqueueSheetJob(deps.prisma, order.restaurantId, {
    kind: "ORDER_STATUS",
    orderNumber: order.orderNumber,
    status,
  });
  scheduleSheetOutboxDrain(deps.prisma);

  logger.info("order_status_updated", {
    orderNumber: order.orderNumber,
    status,
  });

  return { orderNumber: order.orderNumber, status };
}
