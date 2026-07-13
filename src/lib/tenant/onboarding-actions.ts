"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";
import {
  createRestaurantSpreadsheet,
  getServiceAccountEmail,
  verifySpreadsheetAccess,
} from "@/lib/google/provision";
import { seedSampleMenu } from "@/lib/menu/seed";
import { prisma } from "@/lib/prisma";
import {
  TRIAL_DAYS,
  buildWhatsAppDeepLink,
  slugifyRestaurantName,
} from "@/lib/tenant/subscription";
import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phoneWhatsappNotify: z.string().trim().min(8).max(32),
  defaultLanguage: z.enum(["fr", "en"]),
});

export type OnboardResult =
  | { ok: true; restaurantId: string; slug: string }
  | { ok: false; error: string };

export async function createTenantAction(raw: unknown): Promise<OnboardResult> {
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { ok: false, error: "Cet email est déjà utilisé" };
  }

  let slug = data.slug || slugifyRestaurantName(data.name);
  const slugTaken = await prisma.restaurant.findUnique({ where: { slug } });
  if (slugTaken) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const passwordHash = await bcrypt.hash(data.password, 12);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      slug,
      phoneWhatsappNotify: data.phoneWhatsappNotify.replace(/\s/g, ""),
      defaultLanguage: data.defaultLanguage,
      subscriptionStatus: "TRIAL",
      trialEndsAt,
      isOpen: true,
      users: {
        create: {
          email,
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  await seedSampleMenu(restaurant.id, prisma);

  try {
    await signIn("credentials", {
      email,
      password: data.password,
      redirect: false,
    });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    // Account created; user can log in manually
  }

  return { ok: true, restaurantId: restaurant.id, slug: restaurant.slug };
}

export async function provisionSheetCreateAction(): Promise<
  | { ok: true; spreadsheetId: string; spreadsheetUrl: string }
  | { ok: false; error: string }
> {
  const session = await auth();
  try {
    return await withTenant(
      session,
      async (scope) => {
        if (scope.kind !== "restaurant") {
          return { ok: false as const, error: "Sélectionnez un restaurant" };
        }

        const restaurant = await prisma.restaurant.findUniqueOrThrow({
          where: { id: scope.restaurantId },
          include: { users: { where: { role: "OWNER" }, take: 1 } },
        });

        const ownerEmail = session!.user.email ?? restaurant.users[0]?.email;
        if (!ownerEmail) {
          return { ok: false as const, error: "Email owner introuvable" };
        }

        const provisioned = await createRestaurantSpreadsheet({
          restaurantName: restaurant.name,
          ownerEmail,
        });

        const verified = await verifySpreadsheetAccess(provisioned.spreadsheetId);
        if (!verified.ok) {
          return {
            ok: false as const,
            error: verified.error ?? "Vérification Sheet échouée",
          };
        }

        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            googleSpreadsheetId: provisioned.spreadsheetId,
            sheetVerifiedAt: new Date(),
          },
        });

        return {
          ok: true as const,
          spreadsheetId: provisioned.spreadsheetId,
          spreadsheetUrl: provisioned.spreadsheetUrl,
        };
      },
      { roles: ["OWNER", "SUPERADMIN", "STAFF"] },
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Provisioning échoué",
    };
  }
}

export async function connectExistingSheetAction(
  spreadsheetIdRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const spreadsheetId = spreadsheetIdRaw.trim();
  if (!spreadsheetId || spreadsheetId.length < 20) {
    return { ok: false, error: "Spreadsheet ID invalide" };
  }

  try {
    return await withTenant(
      session,
      async (scope) => {
        if (scope.kind !== "restaurant") {
          return { ok: false as const, error: "Sélectionnez un restaurant" };
        }

        const verified = await verifySpreadsheetAccess(spreadsheetId);
        if (!verified.ok) {
          const sa = getServiceAccountEmail();
          return {
            ok: false as const,
            error: sa
              ? `Accès refusé. Partagez le Sheet en éditeur avec ${sa}.`
              : "Accès Sheet refusé. Vérifiez le partage avec le service account.",
          };
        }

        await prisma.restaurant.update({
          where: { id: scope.restaurantId },
          data: {
            googleSpreadsheetId: spreadsheetId,
            sheetVerifiedAt: new Date(),
          },
        });

        return { ok: true as const };
      },
      { roles: ["OWNER", "SUPERADMIN", "STAFF"] },
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connexion Sheet échouée",
    };
  }
}

export async function getOnboardingStatusAction() {
  const session = await auth();
  if (!session?.user?.restaurantId && session?.user?.role !== "SUPERADMIN") {
    return null;
  }

  return withTenant(session, async (scope) => {
    if (scope.kind !== "restaurant") return null;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: scope.restaurantId },
    });
    if (!restaurant) return null;

    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      googleSpreadsheetId: restaurant.googleSpreadsheetId,
      sheetVerifiedAt: restaurant.sheetVerifiedAt?.toISOString() ?? null,
      deepLink: buildWhatsAppDeepLink(restaurant.slug),
      serviceAccountEmail: getServiceAccountEmail(),
      trialEndsAt: restaurant.trialEndsAt?.toISOString() ?? null,
    };
  });
}
