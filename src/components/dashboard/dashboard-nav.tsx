"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ICONS, type NavIconKey } from "@/components/dashboard/nav-icons";
import { cn } from "@/lib/utils";

export function DashboardNav({
  items,
}: {
  items: Array<{ href: string; label: string; icon: NavIconKey }>;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <nav className="flex gap-1.5 overflow-x-auto border-t border-border/60 px-4 py-2.5 lg:hidden">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground ring-1 ring-border",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
