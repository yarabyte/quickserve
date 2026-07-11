/**
 * Integration tests: webhook claim/process → conversation machine → WATI effects.
 * Uses the real DATABASE_URL (Postgres) and mocks WATI senders.
 *
 * Skip automatically when DATABASE_URL is unset.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@prisma/client";

import { BUTTON } from "@/lib/conversation/machine";
import { categoryRowId, itemRowId } from "@/lib/conversation/menu";
import { processWatiWebhook } from "@/lib/webhooks/wati/process";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("webhook → machine → effects (integration)", () => {
  const prisma = new PrismaClient();
  const suffix = Date.now().toString(36);
  const slug = `itest-${suffix}`;
  // Digits only — normalizeWaId strips non-digits
  const waId = `2376${String(Date.now()).slice(-8)}`;

  let restaurantId = "";
  const sent: Array<{ type: string; payload: unknown }> = [];

  const applyEffects = vi.fn(async (_conv: unknown, effects: Array<{ type: string }>) => {
    for (const effect of effects) {
      sent.push({ type: effect.type, payload: effect });
    }
  });

  beforeAll(async () => {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const restaurant = await prisma.restaurant.create({
      data: {
        slug,
        name: `ITest ${suffix}`,
        phoneWhatsappNotify: "237600000000",
        currency: "XAF",
        defaultLanguage: "fr",
        isOpen: true,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        googleSpreadsheetId: "demo-itest-sheet",
        sheetVerifiedAt: new Date(),
        menuSyncedAt: new Date(),
        menuItems: {
          create: [
            {
              externalRef: "it-poulet",
              categoryName: "Plats",
              name: "Poulet DG",
              description: "Test",
              priceXAF: 3500,
              isAvailable: true,
              position: 1,
            },
            {
              externalRef: "it-bissap",
              categoryName: "Boissons",
              name: "Bissap",
              priceXAF: 500,
              isAvailable: true,
              position: 2,
            },
          ],
        },
      },
    });
    restaurantId = restaurant.id;
  });

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany({
      where: { id: { startsWith: `itest-${suffix}` } },
    });
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.reservation.deleteMany({ where: { restaurantId } });
    await prisma.customer.deleteMany({ where: { restaurantId } });
    await prisma.conversation.deleteMany({ where: { waId } });
    await prisma.menuItemCache.deleteMany({ where: { restaurantId } });
    await prisma.sheetOutbox.deleteMany({ where: { restaurantId } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  function event(id: string, text: string) {
    return {
      id: `itest-${suffix}-${id}`,
      waId,
      senderName: "ITest User",
      text,
      type: "text",
      eventType: "message",
      owner: false,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  }

  function buttonEvent(id: string, payload: string) {
    return {
      id: `itest-${suffix}-${id}`,
      waId,
      senderName: "ITest User",
      text: "",
      type: "button",
      eventType: "message",
      owner: false,
      buttonReply: { payload, text: payload },
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  }

  function listEvent(id: string, listId: string) {
    return {
      id: `itest-${suffix}-${id}`,
      waId,
      senderName: "ITest User",
      text: "",
      type: "interactive",
      eventType: "message",
      owner: false,
      listReply: { id: listId, title: listId },
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  }

  async function run(body: unknown) {
    return processWatiWebhook(body, {
      prisma,
      applyEffects: applyEffects as never,
      now: () => new Date(),
    });
  }

  it("parcours commande livraison bout en bout", async () => {
    sent.length = 0;

    let result = await run(event("link", `RESTO-${slug}`));
    expect(result.status).toBe("processed");

    let conv = await prisma.conversation.findUniqueOrThrow({ where: { waId } });
    expect(conv.restaurantId).toBe(restaurantId);

    result = await run(buttonEvent("order", BUTTON.ORDER));
    expect(result.status).toBe("processed");
    expect(sent.some((s) => s.type === "send_list")).toBe(true);

    result = await run(listEvent("cat", categoryRowId("Plats")));
    expect(result.status).toBe("processed");

    result = await run(listEvent("item", itemRowId("it-poulet")));
    expect(result.status).toBe("processed");
    conv = await prisma.conversation.findUniqueOrThrow({ where: { waId } });
    expect(conv.state).toBe("CART");

    result = await run(event("qty", "2"));
    expect(result.status).toBe("processed");
    conv = await prisma.conversation.findUniqueOrThrow({ where: { waId } });
    expect(conv.state).toBe("CART");

    result = await run(buttonEvent("checkout", BUTTON.CART_CHECKOUT));
    result = await run(buttonEvent("delivery", BUTTON.SERVICE_DELIVERY));
    result = await run(event("addr", "Akwa, Douala centre"));
    expect(result.status).toBe("processed");

    result = await run(buttonEvent("confirm", BUTTON.ORDER_CONFIRM));
    expect(result.status).toBe("processed");

    const order = await prisma.order.findFirst({
      where: { restaurantId, customer: { waId } },
      orderBy: { createdAt: "desc" },
    });
    expect(order).toBeTruthy();
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.type).toBe("DELIVERY");
    expect(order?.totalXAF).toBe(7000);
    expect(order?.deliveryAddress).toContain("Akwa");
  });

  it("parcours réservation bout en bout", async () => {
    sent.length = 0;
    // Reset conversation state for reservation path
    await prisma.conversation.update({
      where: { waId },
      data: { state: "START", context: { items: [] } },
    });

    let result = await run(buttonEvent("reserve", BUTTON.RESERVE));
    expect(result.status).toBe("processed");

    result = await run(event("date", "2026-08-15 20:00"));
    expect(result.status).toBe("processed");

    result = await run(event("size", "3"));
    expect(result.status).toBe("processed");

    result = await run(buttonEvent("res-ok", BUTTON.RES_CONFIRM));
    expect(result.status).toBe("processed");

    const reservation = await prisma.reservation.findFirst({
      where: { restaurantId, customer: { waId } },
      orderBy: { createdAt: "desc" },
    });
    expect(reservation).toBeTruthy();
    expect(reservation?.partySize).toBe(3);
    expect(reservation?.status).toBe("REQUESTED");
  });

  it("input inattendu ramène au menu principal", async () => {
    sent.length = 0;
    await prisma.conversation.update({
      where: { waId },
      data: { state: "START", context: { items: [] } },
    });

    const result = await run(event("noise", "asdfghqwerty"));
    expect(result.status).toBe("processed");
    expect(sent.some((s) => s.type === "send_buttons")).toBe(true);
  });
});
