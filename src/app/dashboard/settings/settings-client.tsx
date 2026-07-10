"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateRestaurantSettings } from "@/lib/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SettingsClient({
  restaurant,
  deepLink,
  qrDataUrl,
  serviceAccountEmail,
}: {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phoneWhatsappNotify: string | null;
    defaultLanguage: string;
    googleSpreadsheetId: string | null;
    isOpen: boolean;
    openingHoursJson: string;
  };
  deepLink: string;
  qrDataUrl: string | null;
  serviceAccountEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Réglages</h1>
        <p className="text-sm text-muted-foreground">Configuration du restaurant</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Restaurant</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                try {
                  await updateRestaurantSettings(restaurant.id, {
                    name: String(fd.get("name") ?? ""),
                    phoneWhatsappNotify: String(fd.get("phoneWhatsappNotify") ?? "") || null,
                    defaultLanguage: (String(fd.get("defaultLanguage")) as "fr" | "en") || "fr",
                    googleSpreadsheetId: String(fd.get("googleSpreadsheetId") ?? "") || null,
                    isOpen: fd.get("isOpen") === "on",
                    openingHoursJson: String(fd.get("openingHoursJson") ?? ""),
                  });
                  setMessage("Enregistré");
                  router.refresh();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Erreur");
                }
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" defaultValue={restaurant.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (lecture seule)</Label>
                <Input id="slug" value={restaurant.slug} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneWhatsappNotify">WhatsApp staff (notif)</Label>
                <Input
                  id="phoneWhatsappNotify"
                  name="phoneWhatsappNotify"
                  defaultValue={restaurant.phoneWhatsappNotify ?? ""}
                  placeholder="2376…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                <Select
                  id="defaultLanguage"
                  name="defaultLanguage"
                  defaultValue={restaurant.defaultLanguage}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isOpen"
                name="isOpen"
                type="checkbox"
                defaultChecked={restaurant.isOpen}
                className="h-4 w-4"
              />
              <Label htmlFor="isOpen">Restaurant ouvert</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingHoursJson">Horaires (JSON)</Label>
              <Textarea
                id="openingHoursJson"
                name="openingHoursJson"
                defaultValue={restaurant.openingHoursJson}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleSpreadsheetId">Google Spreadsheet ID</Label>
              <Input
                id="googleSpreadsheetId"
                name="googleSpreadsheetId"
                defaultValue={restaurant.googleSpreadsheetId ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Partagez le Sheet en <strong>éditeur</strong> avec le service account
                {serviceAccountEmail ? (
                  <>
                    {" "}
                    <code className="rounded bg-muted px-1">{serviceAccountEmail}</code>
                  </>
                ) : (
                  " (GOOGLE_SERVICE_ACCOUNT_EMAIL)"
                )}
                . Onglets requis : Menu, Commandes, Reservations.
              </p>
            </div>

            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deep-link client WhatsApp</CardTitle>
          <CardDescription>
            Les clients ouvrent ce lien pour lier la conversation au restaurant (
            <code>RESTO-{restaurant.slug}</code>).
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
              alt={`QR code ${restaurant.slug}`}
              className="h-48 w-48 rounded-md border border-border bg-white p-2"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
