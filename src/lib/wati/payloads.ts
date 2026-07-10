import type {
  WatiSendInteractiveButtonsInput,
  WatiSendInteractiveListInput,
  WatiTemplateParams,
} from "@/types/wati";

const MAX_BUTTONS = 3;

export type WatiButtonsMessagePayload = {
  body: string;
  footer?: string;
  header?: { type: "Text"; text: string };
  buttons: Array<{ text: string; id: string }>;
};

export type WatiListMessagePayload = {
  header: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ title: string; description?: string; id: string }>;
  }>;
};

export type WatiTemplateMessagePayload = {
  template_name: string;
  broadcast_name: string;
  channel_number: string;
  parameters: Array<{ name: string; value: string }>;
};

export function normalizeWaId(waId: string): string {
  return waId.replace(/\D/g, "");
}

export function buildSessionTextQuery(messageText: string): string {
  return new URLSearchParams({ messageText }).toString();
}

export function buildInteractiveButtonsPayload(
  input: WatiSendInteractiveButtonsInput,
): WatiButtonsMessagePayload {
  if (input.buttons.length === 0) {
    throw new Error("At least one button is required");
  }
  if (input.buttons.length > MAX_BUTTONS) {
    throw new Error(`WATI allows at most ${MAX_BUTTONS} buttons`);
  }

  const payload: WatiButtonsMessagePayload = {
    body: input.body,
    buttons: input.buttons.map((button) => ({
      text: button.title,
      id: button.id,
    })),
  };

  if (input.footer) {
    payload.footer = input.footer;
  }

  if (input.header) {
    payload.header = { type: "Text", text: input.header };
  }

  return payload;
}

export function buildInteractiveListPayload(
  input: WatiSendInteractiveListInput,
): WatiListMessagePayload {
  const payload: WatiListMessagePayload = {
    header: input.header,
    body: input.body,
    buttonText: input.button,
    sections: input.sections.map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
      })),
    })),
  };

  if (input.footer) {
    payload.footer = input.footer;
  }

  return payload;
}

export function buildTemplatePayload(
  templateName: string,
  params: WatiTemplateParams,
  options: { broadcastName: string; channelNumber: string },
): WatiTemplateMessagePayload {
  return {
    template_name: templateName,
    broadcast_name: options.broadcastName,
    channel_number: options.channelNumber,
    parameters: Object.entries(params).map(([name, value]) => ({ name, value })),
  };
}

export function buildApiUrl(baseEndpoint: string, path: string, query?: string): string {
  const base = baseEndpoint.replace(/\/$/, "");
  const url = `${base}${path}`;
  return query ? `${url}?${query}` : url;
}
