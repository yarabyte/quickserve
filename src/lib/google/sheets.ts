import { google, type sheets_v4 } from "googleapis";

import { logger } from "@/lib/logger";

import {
  MENU_SHEET,
  ORDERS_SHEET,
  RESERVATIONS_SHEET,
  parseMenuRows,
  rowsFromValues,
  type SheetMenuItem,
} from "./menu-parse";
import {
  orderToSheetRow,
  reservationToSheetRow,
  type OrderSheetSource,
  type ReservationSheetSource,
} from "./mappers";

export type SheetsClient = {
  readMenu: (spreadsheetId: string) => Promise<SheetMenuItem[]>;
  appendOrderRow: (spreadsheetId: string, order: OrderSheetSource) => Promise<void>;
  appendReservationRow: (
    spreadsheetId: string,
    reservation: ReservationSheetSource,
  ) => Promise<void>;
  updateOrderStatusRow: (
    spreadsheetId: string,
    orderNo: string,
    status: string,
  ) => Promise<void>;
};

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim();

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are required for Sheets access",
    );
  }

  return { email, privateKey };
}

export function createSheetsApi(): sheets_v4.Sheets {
  const { email, privateKey } = getCredentials();
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function withBackoff<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status =
        error && typeof error === "object" && "code" in error
          ? Number((error as { code?: number }).code)
          : undefined;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || attempt === maxAttempts - 1) {
        logger.error("sheets_request_failed", {
          label,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      const delayMs = Math.min(8000, 500 * 2 ** attempt);
      logger.warn("sheets_request_retry", { label, attempt, delayMs, status });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export function createSheetsClient(api?: sheets_v4.Sheets): SheetsClient {
  const sheets = api ?? createSheetsApi();

  return {
    async readMenu(spreadsheetId: string): Promise<SheetMenuItem[]> {
      const response = await withBackoff("readMenu", () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${MENU_SHEET}!A:F`,
        }),
      );

      const values = (response.data.values ?? []) as string[][];
      const { items, skipped } = parseMenuRows(rowsFromValues(values));
      logger.info("sheets_menu_read", {
        spreadsheetId,
        items: items.length,
        skipped: skipped.length,
      });
      return items;
    },

    async appendOrderRow(spreadsheetId: string, order: OrderSheetSource): Promise<void> {
      const row = orderToSheetRow(order);
      await withBackoff("appendOrderRow", () =>
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${ORDERS_SHEET}!A:I`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        }),
      );
    },

    async appendReservationRow(
      spreadsheetId: string,
      reservation: ReservationSheetSource,
    ): Promise<void> {
      const row = reservationToSheetRow(reservation);
      await withBackoff("appendReservationRow", () =>
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${RESERVATIONS_SHEET}!A:G`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        }),
      );
    },

    async updateOrderStatusRow(
      spreadsheetId: string,
      orderNo: string,
      status: string,
    ): Promise<void> {
      const response = await withBackoff("readOrdersForStatus", () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${ORDERS_SHEET}!A:I`,
        }),
      );

      const values = (response.data.values ?? []) as string[][];
      if (values.length < 2) {
        throw new Error(`Order ${orderNo} not found in sheet`);
      }

      const header = values[0]!.map((h) => h.trim().toLowerCase());
      const orderCol = header.findIndex(
        (h) => h === "n°commande" || h === "ncommande" || h === "order" || h.includes("commande"),
      );
      const statusCol = header.findIndex((h) => h === "statut" || h === "status");
      const orderIdx = orderCol >= 0 ? orderCol : 1;
      const statusIdx = statusCol >= 0 ? statusCol : 8;

      let rowNumber: number | null = null;
      for (let i = 1; i < values.length; i += 1) {
        if ((values[i]?.[orderIdx] ?? "").trim() === orderNo) {
          rowNumber = i + 1; // 1-based
          break;
        }
      }

      if (!rowNumber) {
        throw new Error(`Order ${orderNo} not found in sheet`);
      }

      const colLetter = String.fromCharCode("A".charCodeAt(0) + statusIdx);
      await withBackoff("updateOrderStatusRow", () =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${ORDERS_SHEET}!${colLetter}${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[status]] },
        }),
      );
    },
  };
}

let defaultClient: SheetsClient | null = null;

export function getSheetsClient(): SheetsClient {
  if (!defaultClient) {
    defaultClient = createSheetsClient();
  }
  return defaultClient;
}

/** Test helper to inject a mock client. */
export function setSheetsClientForTests(client: SheetsClient | null): void {
  defaultClient = client;
}
