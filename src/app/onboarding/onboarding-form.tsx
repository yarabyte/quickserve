"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createTenantAction,
} from "@/lib/tenant/onboarding-actions";
import { slugifyRestaurantName } from "@/lib/tenant/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(
    () => slugOverride ?? slugifyRestaurantName(name),
    [name, slugOverride],
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Créer votre restaurant</CardTitle>
        <CardDescription>
          Essai gratuit 14 jours · commandes & réservations WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await createTenantAction({
                name: String(fd.get("name") ?? ""),
                slug,
                email: String(fd.get("email") ?? ""),
                password: String(fd.get("password") ?? ""),
                phoneWhatsappNotify: String(fd.get("phoneWhatsappNotify") ?? ""),
                defaultLanguage: String(fd.get("defaultLanguage") ?? "fr"),
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/onboarding/setup");
              router.refresh();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom du restaurant</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlugOverride(null);
              }}
              placeholder="Chez Douala"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (deep-link RESTO-…)</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlugOverride(e.target.value.toLowerCase())}
            />
            <p className="text-xs text-muted-foreground">
              Message client : <code>RESTO-{slug || "…"}</code>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneWhatsappNotify">WhatsApp staff (notifications)</Label>
            <Input
              id="phoneWhatsappNotify"
              name="phoneWhatsappNotify"
              required
              placeholder="2376…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Langue par défaut</Label>
            <Select id="defaultLanguage" name="defaultLanguage" defaultValue="fr">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (compte OWNER)</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Création…" : "Créer mon restaurant"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
