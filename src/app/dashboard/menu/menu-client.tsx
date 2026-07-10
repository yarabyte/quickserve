"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resyncMenuAction } from "@/lib/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

export type MenuItemRow = {
  id: string;
  categoryName: string;
  name: string;
  description: string | null;
  priceXAF: number;
  isAvailable: boolean;
  externalRef: string;
};

export function MenuClient({
  restaurantId,
  restaurantName,
  spreadsheetId,
  menuSyncedAt,
  items,
  serviceAccountEmail,
}: {
  restaurantId: string;
  restaurantName: string;
  spreadsheetId: string | null;
  menuSyncedAt: string | null;
  items: MenuItemRow[];
  serviceAccountEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const lang = "fr";
  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {t("dash.menu.title", lang, { name: restaurantName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dash.menu.readonly", lang)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("dash.menu.last_sync", lang, {
              when: menuSyncedAt
                ? new Date(menuSyncedAt).toLocaleString("fr-FR")
                : t("dash.menu.never", lang),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sheetUrl ? (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              {t("dash.menu.open_sheet", lang)}
            </a>
          ) : null}
          <Button
            size="sm"
            disabled={pending || !spreadsheetId}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await resyncMenuAction(restaurantId);
                  setMessage(
                    `Sync OK : ${result.upserted} plats (${result.deleted} supprimés)`,
                  );
                  router.refresh();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Échec sync");
                }
              })
            }
          >
            {pending ? "Sync…" : t("dash.menu.resync", lang)}
          </Button>
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {!spreadsheetId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sheet non configuré</CardTitle>
            <CardDescription>
              Renseignez <code>googleSpreadsheetId</code> dans Réglages
              {serviceAccountEmail
                ? ` et partagez le Sheet en éditeur avec ${serviceAccountEmail}`
                : ""}
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Cache vide — lancez une resynchronisation.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.categoryName}
                  </p>
                  <p className="font-medium">{item.name}</p>
                  {item.description ? (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.externalRef}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.priceXAF.toLocaleString("fr-FR")} FCFA</p>
                  <Badge variant={item.isAvailable ? "success" : "danger"} className="mt-1">
                    {item.isAvailable ? "Dispo" : "Indispo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
