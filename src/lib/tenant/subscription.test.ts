import { describe, expect, it } from "vitest";

import { evaluateSubscription, slugifyRestaurantName } from "./subscription";

describe("evaluateSubscription", () => {
  const base = {
    googleSpreadsheetId: "sheet-1",
    sheetVerifiedAt: new Date("2026-07-01"),
    trialEndsAt: new Date("2026-07-20"),
  };

  it("blocks SUSPENDED tenants", () => {
    const gate = evaluateSubscription(
      { ...base, subscriptionStatus: "SUSPENDED" },
      new Date("2026-07-10"),
    );
    expect(gate.active).toBe(false);
    expect(gate.reason).toBe("SUSPENDED");
    expect(gate.messageFr).toMatch(/indisponible/i);
  });

  it("blocks expired TRIAL", () => {
    const gate = evaluateSubscription(
      {
        ...base,
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date("2026-07-01"),
      },
      new Date("2026-07-10"),
    );
    expect(gate.active).toBe(false);
    expect(gate.reason).toBe("TRIAL_EXPIRED");
  });

  it("blocks missing sheet verification", () => {
    const gate = evaluateSubscription(
      {
        ...base,
        subscriptionStatus: "TRIAL",
        sheetVerifiedAt: null,
      },
      new Date("2026-07-10"),
    );
    expect(gate.active).toBe(false);
    expect(gate.reason).toBe("MISSING_SHEET");
  });

  it("allows active trial with verified sheet", () => {
    const gate = evaluateSubscription(
      { ...base, subscriptionStatus: "TRIAL" },
      new Date("2026-07-10"),
    );
    expect(gate.active).toBe(true);
  });
});

describe("slugifyRestaurantName", () => {
  it("normalizes accents and spaces", () => {
    expect(slugifyRestaurantName("Chez Douala")).toBe("chez-douala");
    expect(slugifyRestaurantName("Café d'Ivoire!")).toBe("cafe-d-ivoire");
  });
});
