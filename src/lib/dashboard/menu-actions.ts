"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";
import { saveMenuImage } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { slugifyRestaurantName } from "@/lib/tenant/subscription";

const menuItemSchema = z.object({
  categoryName: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  priceXAF: z.coerce.number().int().nonnegative().max(10_000_000),
  isAvailable: z.boolean().default(true),
  position: z.coerce.number().int().nonnegative().optional(),
  imageUrl: z
    .union([z.string().trim().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
});

function makeExternalRef(name: string): string {
  const base = slugifyRestaurantName(name).slice(0, 24) || "plat";
  return `${base}-${Date.now().toString(36)}`;
}

export async function createMenuItemAction(
  restaurantId: string,
  raw: z.infer<typeof menuItemSchema>,
) {
  const session = await auth();
  const data = menuItemSchema.parse(raw);

  return withTenant(
    session,
    async () => {
      const count = await prisma.menuItemCache.count({ where: { restaurantId } });
      const item = await prisma.menuItemCache.create({
        data: {
          restaurantId,
          externalRef: makeExternalRef(data.name),
          categoryName: data.categoryName,
          name: data.name,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          priceXAF: data.priceXAF,
          isAvailable: data.isAvailable,
          position: data.position ?? count,
          syncedAt: new Date(),
        },
      });
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { menuSyncedAt: new Date() },
      });
      revalidatePath("/dashboard/menu");
      return { id: item.id };
    },
    { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
  );
}

export async function updateMenuItemAction(
  restaurantId: string,
  itemId: string,
  raw: z.infer<typeof menuItemSchema>,
) {
  const session = await auth();
  const data = menuItemSchema.parse(raw);

  return withTenant(
    session,
    async () => {
      const existing = await prisma.menuItemCache.findFirst({
        where: { id: itemId, restaurantId },
      });
      if (!existing) throw new Error("Plat introuvable");

      await prisma.menuItemCache.update({
        where: { id: itemId },
        data: {
          categoryName: data.categoryName,
          name: data.name,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          priceXAF: data.priceXAF,
          isAvailable: data.isAvailable,
          ...(data.position !== undefined ? { position: data.position } : {}),
          syncedAt: new Date(),
        },
      });
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { menuSyncedAt: new Date() },
      });
      revalidatePath("/dashboard/menu");
      return { ok: true };
    },
    { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
  );
}

export async function deleteMenuItemAction(restaurantId: string, itemId: string) {
  const session = await auth();
  return withTenant(
    session,
    async () => {
      const existing = await prisma.menuItemCache.findFirst({
        where: { id: itemId, restaurantId },
      });
      if (!existing) throw new Error("Plat introuvable");
      await prisma.menuItemCache.delete({ where: { id: itemId } });
      revalidatePath("/dashboard/menu");
      return { ok: true };
    },
    { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
  );
}

export async function uploadMenuImageAction(restaurantId: string, formData: FormData) {
  const session = await auth();
  return withTenant(
    session,
    async () => {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new Error("Fichier manquant");
      }
      const mime = file.type || "application/octet-stream";
      const bytes = new Uint8Array(await file.arrayBuffer());
      const saved = await saveMenuImage({
        restaurantId,
        bytes,
        mimeType: mime,
      });
      return { url: saved.publicUrl };
    },
    { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
  );
}
