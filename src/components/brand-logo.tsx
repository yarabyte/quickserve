import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const markSize = {
  sm: "h-7 w-7 rounded-lg",
  md: "h-8 w-8 rounded-xl",
  lg: "h-10 w-10 rounded-xl",
  xl: "h-14 w-14 rounded-2xl sm:h-16 sm:w-16",
} as const;

const iconSize = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-7 w-7 sm:h-8 sm:w-8",
} as const;

const wordSize = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-5xl sm:text-6xl md:text-7xl",
} as const;

export function BrandLogo({
  className,
  size = "md",
  wordmarkClassName,
  markClassName,
}: {
  className?: string;
  size?: keyof typeof markSize;
  wordmarkClassName?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm",
          markSize[size],
          markClassName,
        )}
        aria-hidden
      >
        <MessageCircle className={cn(iconSize[size], "fill-current")} strokeWidth={2} />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          wordSize[size],
          wordmarkClassName,
        )}
      >
        QuickServe
      </span>
    </span>
  );
}
