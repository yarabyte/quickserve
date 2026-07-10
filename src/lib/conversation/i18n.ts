import { normalizeLanguage, t as translate, type Lang, type MessageKey } from "@/i18n";

export { normalizeLanguage };
export type { Lang, MessageKey };

/** Bot helper — t(key, lang, vars) */
export function t(
  key: MessageKey,
  lang: Lang | string,
  vars?: Record<string, string | number>,
): string {
  return translate(key, lang, vars);
}
