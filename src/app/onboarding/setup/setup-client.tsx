"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  connectExistingSheetAction,
  provisionSheetCreateAction,
} from "@/lib/tenant/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SheetSetupClient({
  restaurantName,
  slug,
  deepLink,
  qrDataUrl,
  sheetVerified,
  spreadsheetId,
  serviceAccountEmail,
}: {
  restaurantName: string;
  slug: string;
  deepLink: string;
  qrDataUrl: string | null;
  sheetVerified: boolean;
  spreadsheetId: string | null;
  serviceAccountEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"create" | "connect">("create");
  const [existingId, setExistingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">QuickServe · {restaurantName}</p>
        <h1 className="mt-1 text-2xl font-semibold">Activer Google Sheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le menu et les commandes vivent dans votre Sheet (onglets Menu / Commandes /
          Reservations).
        </p>
      </div>

      {sheetVerified ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-sm text-emerald-900">Sheet connecté ✅</CardTitle>
            <CardDescription className="text-emerald-800">
              ID : <code>{spreadsheetId}</code>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Provisioning</CardTitle>
            <CardDescription>Choisissez une option</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "create" ? "default" : "outline"}
                onClick={() => setMode("create")}
              >
                Créer un Sheet
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "connect" ? "default" : "outline"}
                onClick={() => setMode("connect")}
              >
                Coller mon ID
              </Button>
            </div>

            {mode === "create" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  QuickServe crée un spreadsheet modèle et le partage avec votre email en
                  éditeur.
                </p>
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await provisionSheetCreateAction();
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    })
                  }
                >
                  {pending ? "Création…" : "Créer mon Google Sheet"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Partagez votre Sheet en <strong>éditeur</strong> avec{" "}
                  <code className="rounded bg-muted px-1 text-xs">
                    {serviceAccountEmail ?? "GOOGLE_SERVICE_ACCOUNT_EMAIL"}
                  </code>{" "}
                  puis collez l&apos;ID.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                  <Input
                    id="spreadsheetId"
                    value={existingId}
                    onChange={(e) => setExistingId(e.target.value)}
                    placeholder="1BxiM…"
                  />
                </div>
                <Button
                  disabled={pending || !existingId.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await connectExistingSheetAction(existingId);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      router.refresh();
                    })
                  }
                >
                  {pending ? "Vérification…" : "Vérifier & connecter"}
                </Button>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deep-link client</CardTitle>
          <CardDescription>
            À coller sur WhatsApp Business / affiches — message{" "}
            <code>RESTO-{slug}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-xs">
              {deepLink}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(deepLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR RESTO-${slug}`}
              className="h-48 w-48 rounded-md border bg-white p-2"
            />
          ) : null}
        </CardContent>
      </Card>

      {sheetVerified ? (
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
        >
          Aller au dashboard
        </Link>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Connectez le Sheet pour activer le bot auprès des clients.
        </p>
      )}
    </div>
  );
}
