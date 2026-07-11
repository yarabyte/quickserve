import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CalendarDays,
  UtensilsCrossed,
  Settings,
  CreditCard,
  Shield,
} from "lucide-react";

export type NavIconKey =
  | "orders"
  | "reservations"
  | "menu"
  | "settings"
  | "billing"
  | "admin";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  orders: ClipboardList,
  reservations: CalendarDays,
  menu: UtensilsCrossed,
  settings: Settings,
  billing: CreditCard,
  admin: Shield,
};
