import { mkdir, writeFile } from "node:fs/promises";
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

/**
 * Save a dish photo under uploads/{restaurantId}/ and return a public app URL.
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

  const dir = path.join(getUploadRoot(), "menu", input.restaurantId);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${extForMime(input.mimeType)}`;
  const absolute = path.join(dir, filename);
  await writeFile(absolute, input.bytes);

  const relativePath = `menu/${input.restaurantId}/${filename}`;
  const publicUrl = `${getPublicAppOrigin()}/api/media/${relativePath}`;

  logger.info("menu_image_saved", {
    restaurantId: input.restaurantId,
    relativePath,
    bytes: input.bytes.byteLength,
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
