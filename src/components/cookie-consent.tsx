"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

import { t, type Lang, normalizeLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "qs_cookie_consent";
export const UI_LANG_KEY = "qs_ui_lang";

type Consent = "accepted" | "rejected";

function readSiteLang(): Lang {
  try {
    return normalizeLanguage(localStorage.getItem(UI_LANG_KEY) ?? "fr");
  } catch {
    return "fr";
  }
}

/** Persist site language and notify listeners (cookie banner, etc.). */
export function broadcastUiLang(lang: Lang) {
  try {
    localStorage.setItem(UI_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qs:lang", { detail: lang }));
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    setLang(readSiteLang());

    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
      if (stored === "accepted" || stored === "rejected") {
        setVisible(false);
        return;
      }
      setVisible(true);
    } catch {
      setVisible(true);
    }

    const onLang = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      if (detail === "fr" || detail === "en") setLang(detail);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_LANG_KEY && e.newValue) {
        setLang(normalizeLanguage(e.newValue));
      }
    };

    window.addEventListener("qs:lang", onLang as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("qs:lang", onLang as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function save(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6"
      lang={lang}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[0_12px_40px_-12px_rgba(15,92,76,0.35)] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p
              id="cookie-consent-title"
              className="font-display text-sm font-semibold tracking-tight text-foreground"
            >
              {t("cookies.title", lang)}
            </p>
            <p
              id="cookie-consent-desc"
              className="text-xs leading-relaxed text-muted-foreground sm:text-sm"
            >
              {t("cookies.body", lang)}
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-col sm:items-stretch">
          <Button size="sm" className="w-full" onClick={() => save("accepted")}>
            {t("cookies.accept", lang)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => save("rejected")}
          >
            {t("cookies.reject", lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
