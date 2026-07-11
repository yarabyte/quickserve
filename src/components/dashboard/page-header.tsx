import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {title}
          </h1>
          {description ? (
            <div className="max-w-2xl text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
