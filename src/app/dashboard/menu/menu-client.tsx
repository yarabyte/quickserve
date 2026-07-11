"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resyncMenuAction } from "@/lib/dashboard/actions";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        title={t("dash.menu.title", lang, { name: restaurantName })}
        description={t("dash.menu.readonly", lang)}
        actions={
          <>
            {sheetUrl ? (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium shadow-sm hover:bg-muted"
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
          </>
        }
      />
      <p className="-mt-3 text-xs text-muted-foreground">
        {t("dash.menu.last_sync", lang, {
          when: menuSyncedAt
            ? new Date(menuSyncedAt).toLocaleString("fr-FR")
            : t("dash.menu.never", lang),
        })}
      </p>

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {message}
        </p>
      ) : null}

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
              <CardContent className="flex items-start justify-between gap-3 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
                    {item.categoryName}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                    {item.name}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                  ) : null}
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {item.externalRef}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold">
                    {item.priceXAF.toLocaleString("fr-FR")}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">FCFA</span>
                  </p>
                  <Badge variant={item.isAvailable ? "success" : "danger"} className="mt-2">
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
