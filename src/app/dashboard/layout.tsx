import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/lib/dashboard/auth-actions";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const lang = "fr";
  const isSuper = session.user.role === "SUPERADMIN";

  const nav = [
    { href: "/dashboard/orders", label: t("dash.nav.orders", lang) },
    { href: "/dashboard/reservations", label: t("dash.nav.reservations", lang) },
    { href: "/dashboard/menu", label: t("dash.nav.menu", lang) },
    { href: "/dashboard/settings", label: t("dash.nav.settings", lang) },
    { href: "/dashboard/billing", label: t("dash.nav.billing", lang) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionBanner />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
              QuickServe
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {isSuper ? (
                <Link
                  href="/dashboard/admin"
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {t("dash.nav.admin", lang)}
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {session.user.email} · {session.user.role}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {t("dash.logout", lang)}
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md bg-muted px-3 py-1.5 text-xs"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
