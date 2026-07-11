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

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <BrandLogo size="sm" />
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Se connecter
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pb-16 pt-4 md:flex-row md:items-start md:gap-14 md:px-10 md:pt-10">
        <aside className="md:sticky md:top-10 md:w-[38%] md:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Étape 1 sur 2
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Créez votre restaurant
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
            Essai gratuit 14 jours. Configurez votre compte, puis connectez Google
            Sheets pour activer les commandes WhatsApp.
          </p>

          <ol className="mt-8 hidden space-y-4 md:block">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Compte & restaurant</p>
                <p className="text-xs text-muted-foreground">Nom, slug, accès owner</p>
              </div>
            </li>
            <li className="flex gap-3 opacity-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Google Sheets</p>
                <p className="text-xs text-muted-foreground">Menu + deep-link WhatsApp</p>
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
