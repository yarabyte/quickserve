import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  WatiSendInteractiveButtonsInput,
  WatiSendInteractiveListInput,
  WatiSendResult,
  WatiTemplateParams,
} from "@/types/wati";

import {
  mediaRelativePathFromUrl,
  resolveMediaAbsolutePath,
} from "@/lib/media/storage";

import {
  buildApiUrl,
  buildInteractiveButtonsPayload,
  buildInteractiveListPayload,
  buildSessionTextQuery,
  buildTemplatePayload,
  normalizeWaId,
} from "./payloads";

export { isSessionActive, WATI_SESSION_WINDOW_MS } from "./session";
export type { SessionConversation } from "./session";
export {
  buildInteractiveButtonsPayload,
  buildInteractiveListPayload,
  buildSessionTextQuery,
  buildTemplatePayload,
  normalizeWaId,
} from "./payloads";

type FetchFn = typeof fetch;

export type WatiClientConfig = {
  apiEndpoint: string;
  accessToken: string;
  channelNumber?: string;
  broadcastName?: string;
  fetchFn?: FetchFn;
  maxRetries?: number;
};

type WatiLogLevel = "info" | "warn" | "error";

type WatiLogEvent =
  | "send_session_text"
  | "send_session_image"
  | "send_interactive_buttons"
  | "send_interactive_list"
  | "send_template"
  | "request_retry"
  | "request_failed";

function logWati(
  level: WatiLogLevel,
  event: WatiLogEvent,
  data: Record<string, unknown>,
): void {
  const entry = {
    service: "wati",
    event,
    ts: new Date().toISOString(),
    ...data,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.info(JSON.stringify(entry));
}

function readConfig(overrides?: Partial<WatiClientConfig>): WatiClientConfig {
  const apiEndpoint = overrides?.apiEndpoint ?? process.env.WATI_API_ENDPOINT;
  const accessToken = overrides?.accessToken ?? process.env.WATI_ACCESS_TOKEN;

  if (!apiEndpoint) {
    throw new Error("WATI_API_ENDPOINT is not configured");
  }
  if (!accessToken) {
    throw new Error("WATI_ACCESS_TOKEN is not configured");
  }

  return {
    apiEndpoint,
    accessToken,
    channelNumber: overrides?.channelNumber ?? process.env.WATI_CHANNEL_NUMBER,
    broadcastName: overrides?.broadcastName ?? process.env.WATI_BROADCAST_NAME ?? "quickserve",
    fetchFn: overrides?.fetchFn ?? fetch,
    maxRetries: overrides?.maxRetries ?? 1,
  };
}

function extractMessageId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const record = data as Record<string, unknown>;
  const message = record.message;

  if (message && typeof message === "object") {
    const messageRecord = message as Record<string, unknown>;
    const fromMessage =
      messageRecord.whatsappMessageId ?? messageRecord.id ?? messageRecord.messageId;
    if (typeof fromMessage === "string") {
      return fromMessage;
    }
  }

  const topLevel = record.whatsappMessageId ?? record.messageId ?? record.id;
  return typeof topLevel === "string" ? topLevel : undefined;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.info;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return `WATI request failed with status ${status}`;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function watiRequest(
  config: WatiClientConfig,
  path: string,
  init: RequestInit,
  logEvent: WatiLogEvent,
  waId: string,
): Promise<WatiSendResult> {
  const fetchFn = config.fetchFn ?? fetch;
  const maxRetries = config.maxRetries ?? 1;
  let lastError = "Unknown WATI error";

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchFn(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          ...init.headers,
        },
      });

      const body = await parseJsonSafe(response);

      if (response.ok) {
        const messageId = extractMessageId(body);
        logWati("info", logEvent, { waId, attempt, ok: true, messageId, status: response.status });
        return { ok: true, messageId };
      }

      lastError = extractErrorMessage(body, response.status);
      const retryable = response.status >= 500 || response.status === 429;

      if (retryable && attempt < maxRetries) {
        logWati("warn", "request_retry", {
          waId,
          attempt,
          status: response.status,
          error: lastError,
          logEvent,
        });
        continue;
      }

      logWati("error", "request_failed", {
        waId,
        attempt,
        status: response.status,
        error: lastError,
        logEvent,
      });
      return { ok: false, error: lastError };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network error";

      if (attempt < maxRetries) {
        logWati("warn", "request_retry", { waId, attempt, error: lastError, logEvent });
        continue;
      }

      logWati("error", "request_failed", { waId, attempt, error: lastError, logEvent });
      return { ok: false, error: lastError };
    }
  }

  return { ok: false, error: lastError };
}

export async function sendSessionText(
  waId: string,
  text: string,
  configOverrides?: Partial<WatiClientConfig>,
): Promise<WatiSendResult> {
  const config = readConfig(configOverrides);
  const normalizedWaId = normalizeWaId(waId);
  const query = buildSessionTextQuery(text);
  const url = buildApiUrl(
    config.apiEndpoint,
    `/api/v1/sendSessionMessage/${normalizedWaId}`,
    query,
  );

  return watiRequest(
    config,
    url,
    { method: "POST" },
    "send_session_text",
    normalizedWaId,
  );
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

async function loadImageBytes(
  imageUrl: string,
  fetchFn: FetchFn,
): Promise<{ bytes: Uint8Array; contentType: string; fileName: string }> {
  // Prefer local disk for /api/media/... so Coolify does not need to HTTP-fetch itself.
  const relative = mediaRelativePathFromUrl(imageUrl);
  if (relative) {
    const absolute = resolveMediaAbsolutePath(relative);
    if (absolute) {
      const bytes = new Uint8Array(await readFile(absolute));
      const ext = path.extname(absolute).toLowerCase();
      const fileName = path.basename(absolute);
      return {
        bytes,
        contentType: MIME_BY_EXT[ext] ?? "image/jpeg",
        fileName,
      };
    }
  }

  const fileResponse = await fetchFn(imageUrl);
  if (!fileResponse.ok) {
    throw new Error(`Image download failed with status ${fileResponse.status}`);
  }
  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  const contentType =
    fileResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const fromUrl = imageUrl.split("?")[0]?.split("/").pop() || "dish.jpg";
  const fileName = /\.(jpe?g|png|gif|webp)$/i.test(fromUrl) ? fromUrl : "dish.jpg";
  return { bytes, contentType, fileName };
}

/**
 * Load a dish image (local upload preferred) and send it via WATI session file upload.
 * Caption appears under the photo in WhatsApp.
 */
export async function sendSessionImage(
  waId: string,
  imageUrl: string,
  caption?: string,
  configOverrides?: Partial<WatiClientConfig>,
): Promise<WatiSendResult> {
  const config = readConfig(configOverrides);
  const normalizedWaId = normalizeWaId(waId);
  const fetchFn = config.fetchFn ?? fetch;

  let loaded: { bytes: Uint8Array; contentType: string; fileName: string };
  try {
    loaded = await loadImageBytes(imageUrl, fetchFn);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch image";
    logWati("error", "request_failed", {
      waId: normalizedWaId,
      error: message,
      logEvent: "send_session_image",
      imageUrl,
    });
    return { ok: false, error: message };
  }

  if (loaded.bytes.byteLength === 0) {
    return { ok: false, error: "Image download returned empty body" };
  }
  if (loaded.bytes.byteLength > 5 * 1024 * 1024) {
    return { ok: false, error: "Image exceeds WhatsApp 5MB limit" };
  }

  const { bytes, contentType, fileName } = loaded;

  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(bytes)], { type: contentType }),
    fileName,
  );

  const query = caption
    ? new URLSearchParams({ caption: caption.slice(0, 1024) }).toString()
    : undefined;
  const url = buildApiUrl(
    config.apiEndpoint,
    `/api/v1/sendSessionFile/${normalizedWaId}`,
    query,
  );

  return watiRequest(
    config,
    url,
    { method: "POST", body: form },
    "send_session_image",
    normalizedWaId,
  );
}

export async function sendInteractiveButtons(
  waId: string,
  input: WatiSendInteractiveButtonsInput,
  configOverrides?: Partial<WatiClientConfig>,
): Promise<WatiSendResult> {
  const config = readConfig(configOverrides);
  const normalizedWaId = normalizeWaId(waId);
  const payload = buildInteractiveButtonsPayload(input);
  const url = buildApiUrl(
    config.apiEndpoint,
    "/api/v1/sendInteractiveButtonsMessage",
    `whatsappNumber=${encodeURIComponent(normalizedWaId)}`,
  );

  return watiRequest(
    config,
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "send_interactive_buttons",
    normalizedWaId,
  );
}

export async function sendInteractiveList(
  waId: string,
  input: WatiSendInteractiveListInput,
  configOverrides?: Partial<WatiClientConfig>,
): Promise<WatiSendResult> {
  const config = readConfig(configOverrides);
  const normalizedWaId = normalizeWaId(waId);
  const payload = buildInteractiveListPayload(input);
  const url = buildApiUrl(
    config.apiEndpoint,
    "/api/v1/sendInteractiveListMessage",
    `whatsappNumber=${encodeURIComponent(normalizedWaId)}`,
  );

  return watiRequest(
    config,
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "send_interactive_list",
    normalizedWaId,
  );
}

export async function sendTemplate(
  waId: string,
  templateName: string,
  params: WatiTemplateParams,
  configOverrides?: Partial<WatiClientConfig>,
): Promise<WatiSendResult> {
  const config = readConfig(configOverrides);

  if (!config.channelNumber) {
    return {
      ok: false,
      error: "WATI_CHANNEL_NUMBER is required to send template messages",
    };
  }

  const normalizedWaId = normalizeWaId(waId);
  const payload = buildTemplatePayload(templateName, params, {
    broadcastName: config.broadcastName ?? "quickserve",
    channelNumber: config.channelNumber,
  });
  const url = buildApiUrl(
    config.apiEndpoint,
    "/api/v1/sendTemplateMessage",
    `whatsappNumber=${encodeURIComponent(normalizedWaId)}`,
  );

  return watiRequest(
    config,
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "send_template",
    normalizedWaId,
  );
}
