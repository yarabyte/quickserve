"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setReservationStatus } from "@/lib/dashboard/actions";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <div className="space-y-6">
      <PageHeader
        title={t("dash.reservations.title", lang)}
        description="Confirmer ou annuler les demandes clients"
      />

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="font-display text-lg">{t("dash.reservations.empty", lang)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les demandes WhatsApp s&apos;afficheront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          reservations.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{r.customerLabel}</CardTitle>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {new Date(r.dateTime).toLocaleString("fr-FR")}
                    {" · "}
                    <span className="font-medium text-foreground">{r.partySize} pers.</span>
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
                {r.note ? (
                  <p className="rounded-xl bg-surface px-3 py-2 text-sm text-muted-foreground">
                    {r.note}
                  </p>
                ) : null}
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
