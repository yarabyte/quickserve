import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/lib/dashboard/auth-actions";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

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
    ...(isSuper
      ? [{ href: "/dashboard/admin", label: t("dash.nav.admin", lang) }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <SubscriptionBanner />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                Q
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                QuickServe
              </span>
            </Link>
            <div className="hidden lg:block">
              <DashboardNav items={nav} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-medium text-foreground">
                {session.user.email}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {session.user.role}
              </p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {t("dash.logout", lang)}
              </Button>
            </form>
          </div>
        </div>
        <div className="lg:hidden">
          <DashboardNav items={nav} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
