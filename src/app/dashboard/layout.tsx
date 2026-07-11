import Link from "next/link";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/lib/dashboard/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import type { NavIconKey } from "@/components/dashboard/nav-icons";
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

  const nav: Array<{ href: string; label: string; icon: NavIconKey }> = [
    { href: "/dashboard/orders", label: t("dash.nav.orders", lang), icon: "orders" },
    {
      href: "/dashboard/reservations",
      label: t("dash.nav.reservations", lang),
      icon: "reservations",
    },
    { href: "/dashboard/menu", label: t("dash.nav.menu", lang), icon: "menu" },
    { href: "/dashboard/settings", label: t("dash.nav.settings", lang), icon: "settings" },
    { href: "/dashboard/billing", label: t("dash.nav.billing", lang), icon: "billing" },
    ...(isSuper
      ? [{ href: "/dashboard/admin", label: t("dash.nav.admin", lang), icon: "admin" as const }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <SubscriptionBanner />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="min-w-0 transition hover:opacity-90">
              <BrandLogo size="md" compactOnMobile />
            </Link>
            <div className="hidden lg:block">
              <DashboardNav items={nav} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t("dash.logout", lang)}</span>
              </Button>
            </form>
          </div>
        </div>
        <div className="lg:hidden">
          <DashboardNav items={nav} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">{children}</main>
    </div>
  );
}
