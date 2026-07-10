import { auth } from "@/auth";
import { withTenant, restaurantWhere } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";

import { ReservationsClient, type ReservationRow } from "./reservations-client";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const session = await auth();

  const reservations = await withTenant(session, async (scope) => {
    const rows = await prisma.reservation.findMany({
      where: restaurantWhere(scope),
      include: { customer: true },
      orderBy: { dateTime: "asc" },
      take: 100,
    });

    return rows.map(
      (r): ReservationRow => ({
        id: r.id,
        status: r.status,
        partySize: r.partySize,
        dateTime: r.dateTime.toISOString(),
        createdAt: r.createdAt.toISOString(),
        customerLabel: r.customer.name ?? r.customer.waId,
        note: r.note,
      }),
    );
  });

  return <ReservationsClient reservations={reservations} />;
}
