"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, Check, Users, X } from "lucide-react";

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
        icon={CalendarDays}
        title={t("dash.reservations.title", lang)}
        description="Confirmer ou annuler les demandes clients"
      />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {reservations.length === 0 ? (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardContent className="py-14 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p className="mt-3 font-display text-lg">{t("dash.reservations.empty", lang)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les demandes WhatsApp s&apos;afficheront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          reservations.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{r.customerLabel}</CardTitle>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {new Date(r.dateTime).toLocaleString("fr-FR")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {r.partySize} pers.
                    </span>
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
              <CardContent className="mt-auto space-y-3">
                {r.note ? (
                  <p className="line-clamp-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted-foreground">
                    {r.note}
                  </p>
                ) : null}
                {r.status === "REQUESTED" ? (
                  <div className="flex flex-wrap gap-2">
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
                      <Check className="h-3.5 w-3.5" aria-hidden />
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
                      <X className="h-3.5 w-3.5" aria-hidden />
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
