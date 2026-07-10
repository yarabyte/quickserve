"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setReservationStatus } from "@/lib/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

export type ReservationRow = {
  id: string;
  status: string;
  partySize: number;
  dateTime: string;
  createdAt: string;
  customerLabel: string;
  note: string | null;
};

export function ReservationsClient({ reservations }: { reservations: ReservationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lang = "fr";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("dash.reservations.title", lang)}</h1>
        <p className="text-sm text-muted-foreground">Confirmer ou annuler les demandes</p>
      </div>

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("dash.reservations.empty", lang)}
            </CardContent>
          </Card>
        ) : (
          reservations.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-sm">{r.customerLabel}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(r.dateTime).toLocaleString("fr-FR")} · {r.partySize} pers.
                  </p>
                </div>
                <Badge
                  variant={
                    r.status === "CONFIRMED"
                      ? "success"
                      : r.status === "CANCELLED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {r.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.note ? <p className="text-sm text-muted-foreground">{r.note}</p> : null}
                {r.status === "REQUESTED" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await setReservationStatus(r.id, "CONFIRMED");
                          router.refresh();
                        })
                      }
                    >
                      Confirmer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await setReservationStatus(r.id, "CANCELLED");
                          router.refresh();
                        })
                      }
                    >
                      Annuler
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
