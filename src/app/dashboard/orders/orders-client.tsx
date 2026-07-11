"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { advanceOrderStatus, markOrderPaid } from "@/lib/dashboard/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

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
  CONFIRMED: "En préparation",
  PREPARING: "Marquer prêt",
  READY: "Marquer livré",
};

const statusLabel: Record<string, string> = {
  ALL: "Toutes",
  CONFIRMED: "Confirmées",
  PREPARING: "Préparation",
  READY: "Prêtes",
  DELIVERED: "Livrées",
  CANCELLED: "Annulées",
};

function statusVariant(status: string) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "READY") return "warning" as const;
  if (status === "PREPARING") return "default" as const;
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
  const lang = "fr";

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dash.orders.title", lang)}
        description={t("dash.orders.poll", lang)}
      />

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
            {statusLabel[s] ?? s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="font-display text-lg text-foreground">Aucune commande</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les commandes WhatsApp apparaîtront ici en direct.
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div
                className={cn(
                  "h-1 w-full",
                  order.status === "READY" && "bg-amber-400",
                  order.status === "PREPARING" && "bg-primary",
                  order.status === "DELIVERED" && "bg-emerald-500",
                  order.status === "CANCELLED" && "bg-red-400",
                  order.status === "CONFIRMED" && "bg-slate-300",
                )}
              />
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-mono text-sm tracking-wide text-primary">
                    {order.orderNumber}
                  </CardTitle>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{order.customerLabel}</span>
                    {" · "}
                    {order.type === "DELIVERY" ? "Livraison" : "À emporter"}
                    {" · "}
                    {new Date(order.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>
                    {order.paymentStatus === "PAID" ? "Payé" : "Impayé"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="rounded-xl bg-surface px-3 py-2 text-sm leading-relaxed">
                  {order.itemsSummary}
                </p>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold tracking-tight">
                      {order.totalXAF.toLocaleString("fr-FR")}{" "}
                      <span className="text-base font-medium text-muted-foreground">FCFA</span>
                    </p>
                    {order.deliveryAddress ? (
                      <p className="mt-1 text-sm text-muted-foreground">{order.deliveryAddress}</p>
                    ) : null}
                  </div>
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
