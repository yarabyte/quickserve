"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  Globe,
  KeyRound,
  Link2,
  Mail,
  Phone,
} from "lucide-react";

import { createTenantAction } from "@/lib/tenant/onboarding-actions";
import { slugifyRestaurantName } from "@/lib/tenant/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-0">
        <form
          className="divide-y divide-border"
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
          <section className="space-y-4 p-6 md:p-8">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Votre restaurant
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ces infos apparaissent dans le bot WhatsApp et le dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Nom du restaurant
              </Label>
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
              <Label htmlFor="slug" className="inline-flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Identifiant (slug)
              </Label>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => setSlugOverride(e.target.value.toLowerCase())}
                placeholder="chez-douala"
              />
              <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground ring-1 ring-border">
                Premier message client :{" "}
                <code className="font-semibold text-primary">RESTO-{slug || "…"}</code>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="phoneWhatsappNotify"
                  className="inline-flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  WhatsApp staff
                </Label>
                <Input
                  id="phoneWhatsappNotify"
                  name="phoneWhatsappNotify"
                  required
                  placeholder="2376…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Notifications des nouvelles commandes
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="defaultLanguage"
                  className="inline-flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Langue par défaut
                </Label>
                <Select id="defaultLanguage" name="defaultLanguage" defaultValue="fr">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-4 p-6 md:p-8">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Compte propriétaire
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pour vous connecter au dashboard QuickServe.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@restaurant.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8 caractères minimum"
              />
            </div>
          </section>

          <div className="space-y-3 p-6 md:p-8">
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending} size="lg">
              {pending ? "Création…" : "Continuer — Google Sheets"}
              {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Aucune carte bancaire requise · essai 14 jours
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
