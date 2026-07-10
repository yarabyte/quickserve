import type {
  WatiSendInteractiveButtonsInput,
  WatiSendInteractiveListInput,
  WatiSendResult,
  WatiTemplateParams,
} from "@/types/wati";

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
