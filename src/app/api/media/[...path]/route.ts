import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { resolveMediaAbsolutePath } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const relative = parts.join("/");
  const absolute = resolveMediaAbsolutePath(relative);
  if (!absolute || !existsSync(absolute)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(absolute).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const size = statSync(absolute).size;
  const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
