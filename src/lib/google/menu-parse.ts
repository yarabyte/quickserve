import { z } from "zod";

import { logger } from "@/lib/logger";

export const MENU_SHEET = "Menu";
export const ORDERS_SHEET = "Commandes";
export const RESERVATIONS_SHEET = "Reservations";

const availableSchema = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = value.trim().toLowerCase();
    return ["oui", "yes", "true", "1", "o", "y", "disponible"].includes(normalized);
  });

export const sheetMenuRowSchema = z.object({
  categoryName: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  priceXAF: z.coerce.number().int().nonnegative(),
  isAvailable: availableSchema,
  externalRef: z.string().trim().min(1),
  position: z.number().int().nonnegative(),
});

export type SheetMenuItem = z.infer<typeof sheetMenuRowSchema>;

export type RawMenuRow = {
  Categorie?: unknown;
  Nom?: unknown;
  Description?: unknown;
  PrixFCFA?: unknown;
  Disponible?: unknown;
  RowRef?: unknown;
  /** 0-based data row index (excluding header) */
  _rowIndex?: number;
};

/**
 * Pure parser: maps sheet rows → typed menu items.
 * Invalid rows are skipped and reported.
 */
export function parseMenuRows(rows: RawMenuRow[]): {
  items: SheetMenuItem[];
  skipped: Array<{ rowIndex: number; reason: string; raw: RawMenuRow }>;
} {
  const items: SheetMenuItem[] = [];
  const skipped: Array<{ rowIndex: number; reason: string; raw: RawMenuRow }> = [];

  rows.forEach((raw, index) => {
    const rowIndex = raw._rowIndex ?? index;
    // Skip fully empty rows
    const values = [raw.Categorie, raw.Nom, raw.Description, raw.PrixFCFA, raw.Disponible, raw.RowRef];
    if (values.every((v) => v === undefined || v === null || String(v).trim() === "")) {
      return;
    }

    const parsed = sheetMenuRowSchema.safeParse({
      categoryName: raw.Categorie,
      name: raw.Nom,
      description:
        raw.Description === undefined || raw.Description === null || String(raw.Description).trim() === ""
          ? null
          : String(raw.Description),
      priceXAF: raw.PrixFCFA,
      isAvailable: raw.Disponible ?? "oui",
      externalRef: raw.RowRef,
      position: rowIndex,
    });

    if (!parsed.success) {
      const reason = parsed.error.issues.map((i) => i.message).join("; ");
      skipped.push({ rowIndex, reason, raw });
      logger.warn("sheets_menu_row_invalid", { rowIndex, reason });
      return;
    }

    items.push(parsed.data);
  });

  return { items, skipped };
}

/** Convert A1-style header row + values into objects. */
export function rowsFromValues(values: string[][]): RawMenuRow[] {
  if (values.length < 2) return [];
  const header = values[0]!.map((h) => h.trim());
  const indexOf = (name: string) =>
    header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const col = {
    Categorie: indexOf("Categorie"),
    Nom: indexOf("Nom"),
    Description: indexOf("Description"),
    PrixFCFA: indexOf("PrixFCFA"),
    Disponible: indexOf("Disponible"),
    RowRef: indexOf("RowRef"),
  };

  return values.slice(1).map((row, i) => ({
    Categorie: col.Categorie >= 0 ? row[col.Categorie] : undefined,
    Nom: col.Nom >= 0 ? row[col.Nom] : undefined,
    Description: col.Description >= 0 ? row[col.Description] : undefined,
    PrixFCFA: col.PrixFCFA >= 0 ? row[col.PrixFCFA] : undefined,
    Disponible: col.Disponible >= 0 ? row[col.Disponible] : undefined,
    RowRef: col.RowRef >= 0 ? row[col.RowRef] : undefined,
    _rowIndex: i,
  }));
}
