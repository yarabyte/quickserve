"use client";

import { useActionState } from "react";
import { Lock, LogIn, Mail } from "lucide-react";

import { authenticate } from "@/lib/dashboard/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(authenticate, undefined);
  const lang = "fr";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground shadow-sm">
            Q
          </div>
          <div>
            <CardTitle className="font-display text-2xl">QuickServe</CardTitle>
            <CardDescription className="mt-1">{t("dash.login.title", lang)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue="owner@chez-douala.test"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                defaultValue="changeme123"
              />
            </div>
            {state?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              <LogIn className="h-4 w-4" aria-hidden />
              {pending ? "Connexion…" : t("dash.login.submit", lang)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
