import { describe, expect, it, vi } from "vitest";

import { parseMenuRows, rowsFromValues } from "./menu-parse";
import {
  buildStaffOrderMessage,
  formatItemsSummary,
  orderToSheetRow,
} from "./mappers";
import { processSheetOutbox } from "./queue";

describe("parseMenuRows", () => {
  it("keeps valid rows and skips invalid ones", () => {
    const { items, skipped } = parseMenuRows([
      {
        Categorie: "Plats",
        Nom: "Poulet DG",
        Description: "Classique",
        PrixFCFA: "3500",
        Disponible: "oui",
        RowRef: "row-1",
        _rowIndex: 0,
      },
      {
        Categorie: "Plats",
        Nom: "",
        PrixFCFA: "abc",
        Disponible: "oui",
        RowRef: "row-bad",
        _rowIndex: 1,
      },
      {
        Categorie: "Boissons",
        Nom: "Bissap",
        PrixFCFA: 500,
        Disponible: "non",
        RowRef: "row-2",
        _rowIndex: 2,
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      externalRef: "row-1",
      name: "Poulet DG",
      priceXAF: 3500,
      isAvailable: true,
    });
    expect(items[1]).toMatchObject({
      externalRef: "row-2",
      isAvailable: false,
    });
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.rowIndex).toBe(1);
  });

  it("maps header values from sheet matrix", () => {
    const rows = rowsFromValues([
      ["Categorie", "Nom", "Description", "PrixFCFA", "Disponible", "RowRef"],
      ["Plats", "Ndolé", "Desc", "3000", "yes", "r1"],
    ]);
    const { items } = parseMenuRows(rows);
    expect(items[0]?.name).toBe("Ndolé");
    expect(items[0]?.priceXAF).toBe(3000);
  });
});

describe("orderToSheetRow", () => {
  it("maps order fields to Commandes columns", () => {
    const row = orderToSheetRow({
      orderNumber: "CD-CHEZ-1007ABC",
      createdAt: new Date("2026-07-10T12:00:00.000Z"),
      customerLabel: "237600000001",
      type: "DELIVERY",
      itemsSummary: formatItemsSummary([
        { name: "Poulet DG", qty: 2 },
        { name: "Bissap", qty: 1 },
      ]),
      totalXAF: 7500,
      deliveryAddress: "Akwa",
      paymentMethod: "CASH",
      status: "CONFIRMED",
    });

    expect(row).toEqual([
      "2026-07-10 12:00:00",
      "CD-CHEZ-1007ABC",
      "237600000001",
      "Livraison",
      "Poulet DG x2, Bissap x1",
      "7500",
      "Akwa",
      "CASH",
      "CONFIRMED",
    ]);
  });
});

describe("buildStaffOrderMessage", () => {
  it("includes order essentials for staff WhatsApp", () => {
    const message = buildStaffOrderMessage({
      restaurantName: "Chez Douala",
      orderNumber: "CD-1",
      type: "DELIVERY",
      customerLabel: "Jean",
      itemsSummary: "Poulet DG x1",
      totalXAF: 3500,
      deliveryAddress: "Bonanjo",
    });

    expect(message).toContain("Chez Douala");
    expect(message).toContain("CD-1");
    expect(message).toContain("Livraison");
    expect(message).toContain("Poulet DG x1");
    expect(message).toContain("3500 FCFA");
    expect(message).toContain("Bonanjo");
  });
});

describe("processSheetOutbox on Sheets failure", () => {
  it("keeps the job for retry and does not throw", async () => {
    const jobs = [
      {
        id: "job-1",
        restaurantId: "resto-1",
        kind: "ORDER_APPEND",
        payload: {
          kind: "ORDER_APPEND",
          order: {
            orderNumber: "CD-1",
            createdAt: new Date().toISOString(),
            customerLabel: "x",
            type: "PICKUP",
            itemsSummary: "A x1",
            totalXAF: 1000,
            status: "CONFIRMED",
          },
        },
        attempts: 0,
        lastError: null,
        nextAttemptAt: new Date(0),
        processedAt: null,
        createdAt: new Date(),
      },
    ];

    const updates: unknown[] = [];
    const prisma = {
      sheetOutbox: {
        findMany: vi.fn(async () => jobs),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: unknown }) => {
          updates.push({ where, data });
          return {};
        }),
      },
      restaurant: {
        findUnique: vi.fn(async () => ({
          googleSpreadsheetId: "sheet-real-id",
        })),
      },
    };

    const sheets = {
      readMenu: vi.fn(),
      appendOrderRow: vi.fn(async () => {
        throw new Error("quota exceeded");
      }),
      appendReservationRow: vi.fn(),
      updateOrderStatusRow: vi.fn(),
    };

    const result = await processSheetOutbox(prisma as never, {
      sheets: sheets as never,
      now: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(sheets.appendOrderRow).toHaveBeenCalledOnce();
    expect(updates[0]).toMatchObject({
      where: { id: "job-1" },
      data: expect.objectContaining({
        attempts: 1,
        lastError: "quota exceeded",
      }),
    });
    // Not marked processed
    expect(
      (updates[0] as { data: { processedAt?: Date } }).data.processedAt,
    ).toBeUndefined();
  });
});
