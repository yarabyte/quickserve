"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { advanceOrderStatus, markOrderPaid } from "@/lib/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

export type OrderRow = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  totalXAF: number;
  deliveryAddress: string | null;
  createdAt: string;
  customerLabel: string;
  itemsSummary: string;
};

const nextLabel: Record<string, string> = {
  CONFIRMED: "→ Préparation",
  PREPARING: "→ Prêt",
  READY: "→ Livré",
};

function statusVariant(status: string) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "READY") return "warning" as const;
  return "secondary" as const;
}

export function OrdersClient({
  orders,
  statusFilter,
}: {
  orders: OrderRow[];
  statusFilter: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  const lang = "fr";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("dash.orders.title", lang)}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.orders.poll", lang)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["ALL", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() =>
                router.push(s === "ALL" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`)
              }
            >
              {s === "ALL" ? t("dash.orders.all", lang) : s}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("dash.orders.empty", lang)}
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-mono text-sm">{order.orderNumber}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.customerLabel} · {order.type} ·{" "}
                    {new Date(order.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{order.itemsSummary}</p>
                <p className="text-sm font-medium">{order.totalXAF.toLocaleString("fr-FR")} FCFA</p>
                {order.deliveryAddress ? (
                  <p className="text-sm text-muted-foreground">📍 {order.deliveryAddress}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {nextLabel[order.status] ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await advanceOrderStatus(order.id);
                          router.refresh();
                        })
                      }
                    >
                      {nextLabel[order.status]}
                    </Button>
                  ) : null}
                  {order.paymentStatus !== "PAID" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await markOrderPaid(order.id);
                          router.refresh();
                        })
                      }
                    >
                      {t("dash.orders.mark_paid", lang)}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
