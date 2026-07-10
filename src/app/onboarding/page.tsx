import Link from "next/link";

import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-medium text-muted-foreground">
          QuickServe
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Onboarding</h1>
      </div>
      <OnboardingForm />
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
