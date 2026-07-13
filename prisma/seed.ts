import "dotenv/config";

import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ReservationStatus,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_MENU_ITEMS: Array<{
  externalRef: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceXAF: number;
  position: number;
}> = [
  {
    externalRef: "menu-poulet-dg",
    categoryName: "Plats",
    name: "Poulet DG",
    description: "Poulet sauté aux plantains mûrs, carottes et haricots verts",
    imageUrl:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80",
    priceXAF: 3500,
    position: 1,
  },
  {
    externalRef: "menu-ndole",
    categoryName: "Plats",
    name: "Ndolé",
    description: "Feuilles de ndolé, arachides, crevettes et bœuf",
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    priceXAF: 3000,
    position: 2,
  },
  {
    externalRef: "menu-eru",
    categoryName: "Plats",
    name: "Eru",
    description: "Légumes eru, waterleaf, stockfish et viande fumée",
    imageUrl: null,
    priceXAF: 2800,
    position: 3,
  },
  {
    externalRef: "menu-poisson-braise",
    categoryName: "Plats",
    name: "Poisson braisé",
    description: "Bar entier braisé, plantains et sauce piment",
    imageUrl:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
    priceXAF: 4500,
    position: 4,
  },
  {
    externalRef: "menu-okok",
    categoryName: "Plats",
    name: "Okok sucré",
    description: "Okok aux arachides et sucre, accompagné de manioc",
    imageUrl: null,
    priceXAF: 2000,
    position: 5,
  },
  {
    externalRef: "menu-soya",
    categoryName: "Grillades",
    name: "Soya (brochettes)",
    description: "Brochettes de bœuf marinées, oignons et piment",
    imageUrl:
      "https://images.unsplash.com/photo-1555939596-19271b1f60d9?auto=format&fit=crop&w=800&q=80",
    priceXAF: 1500,
    position: 6,
  },
  {
    externalRef: "menu-plantain",
    categoryName: "Accompagnements",
    name: "Plantains frits",
    description: "Portion de plantains mûrs frits",
    imageUrl: null,
    priceXAF: 1000,
    position: 7,
  },
  {
    externalRef: "menu-bissap",
    categoryName: "Boissons",
    name: "Jus de bissap",
    description: "Boisson fraîche à l'hibiscus, maison",
    imageUrl: null,
    priceXAF: 500,
    position: 8,
  },
  {
    externalRef: "menu-gingembre",
    categoryName: "Boissons",
    name: "Jus de gingembre",
    description: "Gingembre frais pressé, légèrement épicé",
    imageUrl: null,
    priceXAF: 500,
    position: 9,
  },
  {
    externalRef: "menu-beignets",
    categoryName: "Desserts",
    name: "Beignets de banane",
    description: "Beignets maison à la banane plantain",
    imageUrl: null,
    priceXAF: 800,
    position: 10,
  },
];

async function main() {
  const spreadsheetId =
    process.env.DEMO_SPREADSHEET_ID?.trim() || "demo-local-spreadsheet-id";

  if (!process.env.DEMO_SPREADSHEET_ID?.trim()) {
    console.warn(
      "DEMO_SPREADSHEET_ID not set — using placeholder. Set it in .env before syncing Google Sheets.",
    );
  }

  const ownerEmail = process.env.DEMO_OWNER_EMAIL ?? "owner@chez-douala.test";
  const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? "changeme123";

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "chez-douala" },
    update: {
      name: "Chez Douala",
      phoneWhatsappNotify: "237600000000",
      googleSpreadsheetId: spreadsheetId,
      sheetVerifiedAt: new Date(),
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt,
      menuSyncedAt: new Date(),
      isOpen: true,
    },
    create: {
      slug: "chez-douala",
      name: "Chez Douala",
      phoneWhatsappNotify: "237600000000",
      currency: "XAF",
      defaultLanguage: "fr",
      isOpen: true,
      openingHours: {
        mon: { open: "11:00", close: "22:00" },
        tue: { open: "11:00", close: "22:00" },
        wed: { open: "11:00", close: "22:00" },
        thu: { open: "11:00", close: "22:00" },
        fri: { open: "11:00", close: "23:00" },
        sat: { open: "11:00", close: "23:00" },
        sun: { open: "12:00", close: "21:00" },
      },
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt,
      googleSpreadsheetId: spreadsheetId,
      sheetVerifiedAt: new Date(),
      menuSyncedAt: new Date(),
    },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      passwordHash,
      role: UserRole.OWNER,
      restaurantId: restaurant.id,
    },
    create: {
      email: ownerEmail,
      passwordHash,
      role: UserRole.OWNER,
      restaurantId: restaurant.id,
    },
  });

  const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@quickserve.test";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "admin123456";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: UserRole.SUPERADMIN,
      restaurantId: null,
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: UserRole.SUPERADMIN,
      restaurantId: null,
    },
  });

  const syncedAt = new Date();
  const keepRefs = new Set(DEMO_MENU_ITEMS.map((i) => i.externalRef));

  for (const item of DEMO_MENU_ITEMS) {
    await prisma.menuItemCache.upsert({
      where: {
        restaurantId_externalRef: {
          restaurantId: restaurant.id,
          externalRef: item.externalRef,
        },
      },
      update: {
        categoryName: item.categoryName,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        priceXAF: item.priceXAF,
        isAvailable: true,
        position: item.position,
        syncedAt,
      },
      create: {
        restaurantId: restaurant.id,
        externalRef: item.externalRef,
        categoryName: item.categoryName,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        priceXAF: item.priceXAF,
        isAvailable: true,
        position: item.position,
        syncedAt,
      },
    });
  }

  await prisma.menuItemCache.deleteMany({
    where: {
      restaurantId: restaurant.id,
      externalRef: { notIn: [...keepRefs] },
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      restaurantId_waId: { restaurantId: restaurant.id, waId: "237655512345" },
    },
    update: {
      name: "Amina Nguema",
      defaultAddress: "Bonanjo, face pharmacie du Port, Douala",
      language: "fr",
    },
    create: {
      restaurantId: restaurant.id,
      waId: "237655512345",
      name: "Amina Nguema",
      defaultAddress: "Bonanjo, face pharmacie du Port, Douala",
      language: "fr",
    },
  });

  const orderNumber = "CD-CHEZ-SEED001";
  await prisma.order.upsert({
    where: { orderNumber },
    update: {
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      totalXAF: 4000,
    },
    create: {
      orderNumber,
      restaurantId: restaurant.id,
      customerId: customer.id,
      type: OrderType.DELIVERY,
      status: OrderStatus.CONFIRMED,
      items: [
        {
          menuItemRef: "menu-poulet-dg",
          name: "Poulet DG",
          qty: 1,
          unitPriceXAF: 3500,
        },
        {
          menuItemRef: "menu-bissap",
          name: "Jus de bissap",
          qty: 1,
          unitPriceXAF: 500,
        },
      ],
      totalXAF: 4000,
      deliveryAddress: customer.defaultAddress,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      note: "Sans piment fort",
    },
  });

  const reservationAt = new Date();
  reservationAt.setDate(reservationAt.getDate() + 2);
  reservationAt.setHours(19, 30, 0, 0);

  const existingResa = await prisma.reservation.findFirst({
    where: {
      restaurantId: restaurant.id,
      customerId: customer.id,
      note: "SEED-DEMO-RESA",
    },
  });

  if (existingResa) {
    await prisma.reservation.update({
      where: { id: existingResa.id },
      data: {
        dateTime: reservationAt,
        partySize: 4,
        status: ReservationStatus.REQUESTED,
      },
    });
  } else {
    await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        dateTime: reservationAt,
        partySize: 4,
        status: ReservationStatus.REQUESTED,
        note: "SEED-DEMO-RESA",
      },
    });
  }

  console.log(`Seeded restaurant "${restaurant.name}" (${restaurant.slug})`);
  console.log(`Owner: ${ownerEmail} / ${ownerPassword}`);
  console.log(`Superadmin: ${adminEmail} / ${adminPassword}`);
  console.log(`Menu items: ${DEMO_MENU_ITEMS.length}`);
  console.log(`Demo order: ${orderNumber}`);
  console.log(`Demo reservation: ${reservationAt.toISOString()} (4 pers.)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
