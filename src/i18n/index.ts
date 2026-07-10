import { en } from "./en";
import { fr, type MessageKey } from "./fr";

export type Lang = "fr" | "en";
export type { MessageKey };

const catalogs: Record<Lang, Record<MessageKey, string>> = { fr, en };

export function normalizeLanguage(value: string | null | undefined): Lang {
  return value?.toLowerCase().startsWith("en") ? "en" : "fr";
}

/**
 * Translate a message key.
 * Signature: t(key, lang, vars?)
 */
export function t(
  key: MessageKey,
  lang: Lang | string = "fr",
  vars?: Record<string, string | number>,
): string {
  const normalized = normalizeLanguage(lang);
  let out = catalogs[normalized][key] ?? catalogs.fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}
