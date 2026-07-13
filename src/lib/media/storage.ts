import { mkdir, writeFile, access, constants } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { logger } from "@/lib/logger";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads");
}

export function getPublicAppOrigin(): string {
  const raw =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function mapWriteError(error: unknown, dir: string): Error {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  if (code === "EACCES" || code === "EPERM") {
    return new Error(
      `Impossible d’écrire dans ${dir} (permissions). Sur Coolify : Persistent Storage → /data/uploads, variable UPLOAD_DIR=/data/uploads, puis Redeploy. Le volume doit être accessible en écriture.`,
    );
  }
  if (code === "ENOENT") {
    return new Error(`Dossier upload introuvable : ${dir}`);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Échec enregistrement image : ${message}`);
}

/**
 * Save a dish photo under uploads/menu/{restaurantId}/ and return a public app URL.
 */
export async function saveMenuImage(input: {
  restaurantId: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<{ relativePath: string; publicUrl: string }> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error("Format image non supporté (JPEG, PNG, WebP, GIF)");
  }
  if (input.bytes.byteLength === 0) {
    throw new Error("Fichier image vide");
  }
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image trop lourde (max 5 Mo)");
  }

  const root = getUploadRoot();
  const dir = path.join(root, "menu", input.restaurantId);

  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
  } catch (error) {
    throw mapWriteError(error, dir);
  }

  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${extForMime(input.mimeType)}`;
  const absolute = path.join(dir, filename);

  try {
    await writeFile(absolute, input.bytes);
  } catch (error) {
    throw mapWriteError(error, dir);
  }

  const relativePath = `menu/${input.restaurantId}/${filename}`;
  const publicUrl = `${getPublicAppOrigin()}/api/media/${relativePath}`;

  logger.info("menu_image_saved", {
    restaurantId: input.restaurantId,
    relativePath,
    bytes: input.bytes.byteLength,
    uploadRoot: root,
  });

  return { relativePath, publicUrl };
}

/** Resolve a stored relative media path to an absolute filesystem path (path-traversal safe). */
export function resolveMediaAbsolutePath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  if (!normalized.startsWith("menu/")) return null;

  const root = path.resolve(getUploadRoot());
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) return null;
  return absolute;
}

/** Extract `menu/...` relative path from a public `/api/media/...` URL (or path). */
export function mediaRelativePathFromUrl(imageUrl: string): string | null {
  try {
    const pathname = imageUrl.includes("://")
      ? new URL(imageUrl).pathname
      : imageUrl.split("?")[0] ?? "";
    const marker = "/api/media/";
    const idx = pathname.indexOf(marker);
    if (idx < 0) return null;
    return pathname.slice(idx + marker.length) || null;
  } catch {
    return null;
  }
}
