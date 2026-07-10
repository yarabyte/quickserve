import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">QuickServe</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Commandes WhatsApp pour restaurants
        </h1>
        <p className="mt-2 text-muted-foreground">
          Dashboard multi-tenant · bot WATI · menu Google Sheets
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Créer mon restaurant
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
