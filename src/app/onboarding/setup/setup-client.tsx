"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  QrCode,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import {
  connectExistingSheetAction,
  provisionSheetCreateAction,
} from "@/lib/tenant/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <main className="relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 100% 0%, rgba(15, 92, 76, 0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(26, 122, 100, 0.08), transparent 50%), linear-gradient(165deg, #f4faf7 0%, #eef2f1 100%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 md:px-10">
        <Link href="/" className="min-w-0 transition hover:opacity-90">
          <BrandLogo size="sm" compactOnMobile />
        </Link>
        <p className="max-w-[45%] truncate text-right text-sm text-muted-foreground sm:max-w-none">
          {restaurantName}
        </p>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pb-16 pt-2 sm:gap-10 sm:px-6 md:flex-row md:items-start md:gap-14 md:px-10 md:pt-10">
        <aside className="md:sticky md:top-10 md:w-[38%] md:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Étape 2 sur 2
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Activer Google Sheets
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
            Export des commandes et réservations (onglets Commandes / Reservations). Le menu
            se gère dans le dashboard.
          </p>

          <ol className="mt-6 flex gap-2 md:mt-8 md:block md:space-y-4">
            <li className="flex flex-1 items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 opacity-80 md:flex-none md:rounded-none md:bg-transparent md:px-0 md:py-0 md:opacity-60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold sm:text-sm">Compte</p>
                <p className="hidden text-xs text-muted-foreground md:block">Terminé</p>
              </div>
            </li>
            <li className="flex flex-1 items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 md:flex-none md:rounded-none md:bg-transparent md:px-0 md:py-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold sm:text-sm">Sheets</p>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Export commandes + réservations
                </p>
              </div>
            </li>
          </ol>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {sheetVerified ? (
            <Card className="border-emerald-200 bg-emerald-50/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Sheet connecté
                </CardTitle>
                <CardDescription className="text-emerald-800">
                  ID : <code className="text-xs">{spreadsheetId}</code>
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
                  Provisioning
                </CardTitle>
                <CardDescription>Créez un Sheet modèle ou connectez le vôtre</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      mode === "create"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Créer un Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("connect")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      mode === "connect"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Coller mon ID
                  </button>
                </div>

                {mode === "create" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      QuickServe crée un spreadsheet modèle et le partage avec votre email
                      en éditeur.
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

                {error ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
                    {error}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Link2 className="h-5 w-5 text-primary" aria-hidden />
                Deep-link client
              </CardTitle>
              <CardDescription>
                À partager sur WhatsApp Business / affiches — message{" "}
                <code className="text-primary">RESTO-{slug}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <code className="min-w-0 flex-1 break-all rounded-xl bg-surface px-3 py-2.5 text-xs ring-1 ring-border">
                  {deepLink}
                </code>
                <div className="flex shrink-0 gap-2">
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
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {copied ? "Copié" : "Copier"}
                  </Button>
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium shadow-sm transition hover:bg-muted/60",
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Ouvrir
                  </a>
                </div>
              </div>
              {qrDataUrl ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row">
                  <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR RESTO-${slug}`}
                      className="h-36 w-36 sm:h-40 sm:w-40"
                    />
                  </div>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground sm:pt-1">
                    <QrCode className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Scannez pour ouvrir le chat avec le bon restaurant.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {sheetVerified ? (
            <Link
              href="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-accent sm:w-auto sm:self-start"
            >
              Aller au dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <p className="text-center text-xs text-muted-foreground md:text-left">
              Connectez le Sheet pour activer le bot auprès des clients.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
