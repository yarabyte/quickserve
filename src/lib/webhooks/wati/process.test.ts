import { beforeEach, describe, expect, it, vi } from "vitest";

import { processWatiWebhook } from "./process";

const inboundEvent = {
  id: "wati-event-idempotence-1",
  waId: "237600000001",
  senderName: "Test User",
  text: "RESTO-chez-douala",
  type: "text",
  eventType: "message",
  owner: false,
  buttonReply: null,
  listReply: null,
  timestamp: "1710000000",
};

function createPrismaMock() {
  const webhookIds = new Set<string>();
  const conversations = new Map<
    string,
    {
      id: string;
      waId: string;
      restaurantId: string | null;
      state: string;
      context: Record<string, unknown>;
      language: string;
      lastInboundAt: Date | null;
    }
  >();

  const restaurant = {
    id: "resto-1",
    slug: "chez-douala",
    name: "Chez Douala",
    isOpen: true,
    defaultLanguage: "fr",
    currency: "XAF",
    subscriptionStatus: "TRIAL",
    trialEndsAt: new Date("2099-01-01"),
    googleSpreadsheetId: "sheet-1",
    sheetVerifiedAt: new Date("2026-07-01"),
  };

  return {
    webhookEvent: {
      create: vi.fn(async ({ data }: { data: { id: string } }) => {
        if (webhookIds.has(data.id)) {
          const { Prisma } = await import("@prisma/client");
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          });
        }
        webhookIds.add(data.id);
        return data;
      }),
      update: vi.fn(async ({ where }: { where: { id: string } }) => {
        return { id: where.id, processedAt: new Date() };
      }),
    },
    conversation: {
      findUnique: vi.fn(async ({ where }: { where: { waId: string } }) => {
        return conversations.get(where.waId) ?? null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const found = [...conversations.values()].find((c) => c.id === where.id);
        if (!found) throw new Error("conversation not found");
        return found;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            waId: string;
            state: string;
            context: Record<string, unknown>;
            language: string;
            lastInboundAt: Date;
          };
        }) => {
          const row = {
            id: `conv-${data.waId}`,
            restaurantId: null as string | null,
            ...data,
          };
          conversations.set(data.waId, row);
          return row;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const existing = [...conversations.values()].find((c) => c.id === where.id);
          if (!existing) throw new Error("conversation not found");
          const next = {
            ...existing,
            ...data,
            restaurantId:
              typeof data.restaurantId === "string"
                ? data.restaurantId
                : existing.restaurantId,
          };
          conversations.set(existing.waId, next);
          return next;
        },
      ),
    },
    restaurant: {
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => {
        return where.slug === restaurant.slug ? restaurant : null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === restaurant.id) return restaurant;
        throw new Error("restaurant not found");
      }),
    },
    menuItemCache: {
      findMany: vi.fn(async () => []),
    },
    customer: {
      upsert: vi.fn(async () => ({ id: "cust-1", name: null, waId: "237600000001" })),
    },
    order: {
      create: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
    },
    sheetOutbox: {
      create: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
    _webhookIds: webhookIds,
  };
}

describe("processWatiWebhook idempotence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("processes the same event only once when delivered twice", async () => {
    const prisma = createPrismaMock();
    const runEngine = vi.fn(() => ({
      nextState: "AWAITING_INTENT",
      effects: [{ type: "send_text" as const, text: "ok" }],
    }));
    const applyEffects = vi.fn(async () => undefined);

    const deps = {
      prisma: prisma as never,
      runEngine,
      applyEffects,
      now: () => new Date("2026-07-10T12:00:00.000Z"),
    };

    const first = await processWatiWebhook(inboundEvent, deps);
    const second = await processWatiWebhook(inboundEvent, deps);

    expect(first).toMatchObject({
      status: "processed",
      eventId: inboundEvent.id,
      waId: "237600000001",
    });
    expect(second).toEqual({
      status: "duplicate",
      eventId: inboundEvent.id,
    });

    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(2);
    expect(runEngine).toHaveBeenCalledTimes(1);
    expect(applyEffects).toHaveBeenCalledTimes(1);
  });

  it("ignores delivered/read status events without claiming", async () => {
    const prisma = createPrismaMock();
    const runEngine = vi.fn();

    const result = await processWatiWebhook(
      {
        id: "status-1",
        waId: "237600000001",
        type: "text",
        eventType: "delivered",
        statusString: "DELIVERED",
        owner: false,
      },
      { prisma: prisma as never, runEngine },
    );

    expect(result).toEqual({ status: "ignored", reason: "non_inbound" });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(runEngine).not.toHaveBeenCalled();
  });
});
