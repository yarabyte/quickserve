import type { OrderStatus, Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { withTenant, restaurantWhere } from "@/lib/auth/tenant";
import { formatItemsSummary } from "@/lib/google/mappers";
import { prisma } from "@/lib/prisma";

import { OrdersClient, type OrderRow } from "./orders-client";

export const dynamic = "force-dynamic";

type ItemSnap = { name: string; qty: number; unitPriceXAF?: number };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; restaurantId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const statusFilter = params.status?.toUpperCase() ?? "ALL";

  const orders = await withTenant(
    session,
    async (scope) => {
      const where: Prisma.OrderWhereInput = {
        ...restaurantWhere(scope),
        ...(statusFilter !== "ALL" ? { status: statusFilter as OrderStatus } : {}),
      };

      const rows = await prisma.order.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return rows.map((order): OrderRow => {
        const items = (order.items as ItemSnap[]) ?? [];
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalXAF: order.totalXAF,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt.toISOString(),
          customerLabel: order.customer.name ?? order.customer.waId,
          itemsSummary: formatItemsSummary(items),
        };
      });
    },
    params.restaurantId ? { restaurantId: params.restaurantId } : undefined,
  );

  return <OrdersClient orders={orders} statusFilter={statusFilter} />;
}
