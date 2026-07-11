import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
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
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <BrandLogo size="sm" compactOnMobile />
        </Link>
        <Link
          href="/login"
          className="shrink-0 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Se connecter
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pb-16 pt-2 sm:gap-10 sm:px-6 md:flex-row md:items-start md:gap-14 md:px-10 md:pt-10">
        <aside className="md:sticky md:top-10 md:w-[38%] md:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Étape 1 sur 2
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Créez votre restaurant
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
            Essai gratuit 14 jours. Configurez votre compte, puis connectez Google
            Sheets pour activer les commandes WhatsApp.
          </p>

          <ol className="mt-6 flex gap-2 md:mt-8 md:block md:space-y-4 md:gap-0">
            <li className="flex flex-1 items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 md:flex-none md:rounded-none md:bg-transparent md:px-0 md:py-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                  Compte
                </p>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Nom, slug, accès owner
                </p>
              </div>
            </li>
            <li className="flex flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 opacity-70 md:flex-none md:rounded-none md:bg-transparent md:px-0 md:py-0 md:opacity-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground md:bg-muted">
                2
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                  Sheets
                </p>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Menu + deep-link WhatsApp
                </p>
              </div>
            </li>
          </ol>
        </aside>

        <div className="min-w-0 flex-1">
          <OnboardingForm />
          <p className="mt-6 text-center text-sm text-muted-foreground md:text-left">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
