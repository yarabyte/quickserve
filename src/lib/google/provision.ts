import { google, type drive_v3, type sheets_v4 } from "googleapis";

import { logger } from "@/lib/logger";
import { ORDERS_SHEET, RESERVATIONS_SHEET } from "@/lib/google/menu-parse";

const ORDERS_HEADERS = [
  "Date",
  "N°Commande",
  "Client",
  "Type",
  "Articles",
  "TotalFCFA",
  "Adresse",
  "Paiement",
  "Statut",
];

const RESERVATIONS_HEADERS = [
  "DateCréation",
  "Id",
  "Client",
  "DateHeure",
  "Couverts",
  "Statut",
  "Note",
];

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim();
  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are required",
    );
  }
  return { email, privateKey };
}

function createAuth() {
  const { email, privateKey } = getCredentials();
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
}

export function createProvisionSheetsApi(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: createAuth() });
}

export function createDriveApi(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: createAuth() });
}

export type ProvisionResult = {
  spreadsheetId: string;
  spreadsheetUrl: string;
};

/**
 * Creates a QuickServe spreadsheet with Commandes / Reservations tabs + headers,
 * then shares it with the owner email as writer.
 * Menus are managed in the dashboard — no Menu sheet.
 */
export async function createRestaurantSpreadsheet(input: {
  restaurantName: string;
  ownerEmail: string;
  sheets?: sheets_v4.Sheets;
  drive?: drive_v3.Drive;
}): Promise<ProvisionResult> {
  const sheets = input.sheets ?? createProvisionSheetsApi();
  const drive = input.drive ?? createDriveApi();

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `QuickServe — ${input.restaurantName}`,
      },
      sheets: [
        { properties: { title: ORDERS_SHEET, index: 0 } },
        { properties: { title: RESERVATIONS_SHEET, index: 1 } },
      ],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Google Sheets create returned no spreadsheetId");
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `${ORDERS_SHEET}!A1:I1`, values: [ORDERS_HEADERS] },
        { range: `${RESERVATIONS_SHEET}!A1:G1`, values: [RESERVATIONS_HEADERS] },
      ],
    },
  });

  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: true,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: input.ownerEmail,
      },
    });
  } catch (error) {
    logger.warn("sheet_share_owner_failed", {
      ownerEmail: input.ownerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  logger.info("sheet_provisioned", { spreadsheetId, ownerEmail: input.ownerEmail });

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Verifies the service account can read/write the Commandes tab.
 */
export async function verifySpreadsheetAccess(
  spreadsheetId: string,
  sheets?: sheets_v4.Sheets,
): Promise<{ ok: boolean; error?: string }> {
  const api = sheets ?? createProvisionSheetsApi();

  try {
    await api.spreadsheets.get({ spreadsheetId });
    await api.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A1:I1`,
    });

    const probeRange = `${ORDERS_SHEET}!Z1`;
    await api.spreadsheets.values.update({
      spreadsheetId,
      range: probeRange,
      valueInputOption: "RAW",
      requestBody: { values: [["qs-probe"]] },
    });
    await api.spreadsheets.values.clear({
      spreadsheetId,
      range: probeRange,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("sheet_verify_failed", { spreadsheetId, error: message });
    return { ok: false, error: message };
  }
}

export function getServiceAccountEmail(): string | null {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || null;
}
