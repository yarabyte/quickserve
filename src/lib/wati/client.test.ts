import { afterEach, describe, expect, it, vi } from "vitest";

import {
  sendInteractiveButtons,
  sendInteractiveList,
  sendSessionText,
} from "./client";
import {
  buildInteractiveButtonsPayload,
  buildInteractiveListPayload,
  buildSessionTextQuery,
} from "./payloads";
import { isSessionActive } from "./session";

const testConfig = {
  apiEndpoint: "https://live-server-1234.wati.io",
  accessToken: "test-token",
  fetchFn: vi.fn(),
  maxRetries: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildInteractiveButtonsPayload", () => {
  it("maps id/title buttons to the WATI payload format", () => {
    const payload = buildInteractiveButtonsPayload({
      body: "Choisissez une option",
      buttons: [
        { id: "order", title: "Commander" },
        { id: "reserve", title: "Réserver" },
      ],
      header: "Chez Douala",
    });

    expect(payload).toEqual({
      body: "Choisissez une option",
      header: { type: "Text", text: "Chez Douala" },
      buttons: [
        { text: "Commander", id: "order" },
        { text: "Réserver", id: "reserve" },
      ],
    });
  });

  it("rejects more than 3 buttons", () => {
    expect(() =>
      buildInteractiveButtonsPayload({
        body: "Trop de boutons",
        buttons: [
          { id: "1", title: "Un" },
          { id: "2", title: "Deux" },
          { id: "3", title: "Trois" },
          { id: "4", title: "Quatre" },
        ],
      }),
    ).toThrow("WATI allows at most 3 buttons");
  });
});

describe("buildInteractiveListPayload", () => {
  it("maps sections and rows with stable ids", () => {
    const payload = buildInteractiveListPayload({
      header: "Menu",
      body: "Sélectionnez un plat",
      button: "Voir le menu",
      sections: [
        {
          title: "Plats",
          rows: [
            { id: "item-1", title: "Poulet DG", description: "Classique" },
            { id: "item-2", title: "Ndolé" },
          ],
        },
      ],
    });

    expect(payload.buttonText).toBe("Voir le menu");
    expect(payload.sections[0]?.rows[0]).toEqual({
      id: "item-1",
      title: "Poulet DG",
      description: "Classique",
    });
  });
});

describe("sendSessionText", () => {
  it("POSTs to WATI with Bearer token and encoded messageText", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: { whatsappMessageId: "wamid.abc" } }),
    });

    const result = await sendSessionText("+237600000000", "Bonjour", {
      ...testConfig,
      fetchFn: fetchMock,
    });

    expect(result).toEqual({ ok: true, messageId: "wamid.abc" });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://live-server-1234.wati.io/api/v1/sendSessionMessage/237600000000?${buildSessionTextQuery("Bonjour")}`,
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });
});

describe("sendInteractiveButtons", () => {
  it("sends JSON payload to the interactive buttons endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await sendInteractiveButtons(
      "237600000000",
      {
        body: "Que souhaitez-vous faire ?",
        buttons: [{ id: "menu", title: "Voir le menu" }],
      },
      { ...testConfig, fetchFn: fetchMock },
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://live-server-1234.wati.io/api/v1/sendInteractiveButtonsMessage?whatsappNumber=237600000000",
    );
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      body: "Que souhaitez-vous faire ?",
      buttons: [{ text: "Voir le menu", id: "menu" }],
    });
  });
});

describe("isSessionActive", () => {
  it("returns true when last inbound is within 24 hours", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(isSessionActive({ lastInboundAt: twoHoursAgo })).toBe(true);
  });

  it("returns false when last inbound is older than 24 hours", () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(isSessionActive({ lastInboundAt: yesterday })).toBe(false);
  });
});
