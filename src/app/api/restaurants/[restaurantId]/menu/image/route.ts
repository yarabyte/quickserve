import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { withTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { saveMenuImage } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadBlob = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  size: number;
  type: string;
};

function asUploadBlob(value: FormDataEntryValue | null): UploadBlob | null {
  if (!value || typeof value === "string") return null;
  if (typeof value.arrayBuffer !== "function") return null;
  return value;
}

/**
 * POST /api/restaurants/:restaurantId/menu/image
 * multipart form field: file
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
): Promise<Response> {
  const session = await auth();
  const { restaurantId } = await context.params;

  try {
    const formData = await request.formData();
    const file = asUploadBlob(formData.get("file"));

    if (!file) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const bytes = new Uint8Array(await file.arrayBuffer());

    const saved = await withTenant(
      session,
      async () =>
        saveMenuImage({
          restaurantId,
          bytes,
          mimeType: mime,
        }),
      { restaurantId, roles: ["OWNER", "SUPERADMIN", "STAFF"] },
    );

    return NextResponse.json({ ok: true, url: saved.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload échoué";
    logger.error("menu_image_upload_failed", { restaurantId, error: message });
    const status = message.includes("Non authentifié") || message.includes("Accès")
      ? 401
      : message.includes("permissions") || message.includes("écrire")
        ? 503
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
