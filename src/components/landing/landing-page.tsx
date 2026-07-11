"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  MessageCircle,
  Sheet,
  ArrowRight,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { broadcastUiLang, UI_LANG_KEY } from "@/components/cookie-consent";
import { t, type Lang, normalizeLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

export function LandingPage() {
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = normalizeLanguage(localStorage.getItem(UI_LANG_KEY) ?? "fr");
      setLang(stored);
      broadcastUiLang(stored);
    } catch {
      broadcastUiLang("fr");
    }
  }, []);

  function changeLang(next: Lang) {
    setLang(next);
    broadcastUiLang(next);
  }

  return (
    <main className="landing flex flex-1 flex-col" lang={lang}>
      <header className="landing-fade absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 md:px-10">
        <Link href="/" className="min-w-0 transition hover:opacity-90">
          <BrandLogo size="md" compactOnMobile />
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div
            className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium shadow-sm"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => changeLang("fr")}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                lang === "fr"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => changeLang("en")}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              EN
            </button>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t("landing.login", lang)}
          </Link>
        </div>
      </header>

      <section className="relative flex flex-col justify-center overflow-hidden pt-20 md:min-h-[100svh] md:pt-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 100% 0%, rgba(15, 92, 76, 0.14), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(26, 122, 100, 0.1), transparent 50%), linear-gradient(165deg, #f4faf7 0%, #e8f1ed 45%, #dfeae5 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f5c4c' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 pb-12 pt-6 sm:gap-12 sm:px-6 sm:pb-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16 md:px-10 md:pb-24 md:pt-20">
          <div className="landing-fade space-y-5 sm:space-y-6">
            <h1 className="max-w-xl font-display text-[1.65rem] font-medium leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("landing.headline", lang)}
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
              {t("landing.sub", lang)}
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/onboarding"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-accent sm:w-auto"
              >
                {t("landing.cta_primary", lang)}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted sm:w-auto"
              >
                {t("landing.cta_secondary", lang)}
              </Link>
            </div>
          </div>

          <div className="landing-phone mx-auto w-full max-w-[280px] sm:max-w-[320px] md:mx-0 md:justify-self-end">
            <div className="overflow-hidden rounded-[1.75rem] bg-[#0b1410] shadow-[0_20px_50px_-18px_rgba(15,92,76,0.45)] ring-1 ring-border">
              <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Chez Douala</p>
                  <p className="text-[11px] text-white/70">
                    {t("landing.chat.online", lang)}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 bg-[#0b1410] px-3 py-4">
                <ChatBubble delay="0.15s" side="in">
                  {t("landing.chat.welcome", lang)}
                </ChatBubble>
                <ChatBubble delay="0.35s" side="out">
                  {t("landing.chat.order", lang)}
                </ChatBubble>
                <ChatBubble delay="0.55s" side="in">
                  {t("landing.chat.categories", lang)}
                  <span className="mt-2 flex flex-col gap-1.5">
                    <span className="rounded-md bg-white/10 px-2.5 py-1.5 text-[12px]">
                      {t("landing.chat.cat1", lang)}
                    </span>
                    <span className="rounded-md bg-white/10 px-2.5 py-1.5 text-[12px]">
                      {t("landing.chat.cat2", lang)}
                    </span>
                    <span className="rounded-md bg-white/10 px-2.5 py-1.5 text-[12px]">
                      {t("landing.chat.cat3", lang)}
                    </span>
                  </span>
                </ChatBubble>
                <ChatBubble delay="0.75s" side="out">
                  {t("landing.chat.cat2", lang)}
                </ChatBubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-border/60 bg-surface/80 px-4 py-14 sm:px-6 sm:py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {t("landing.steps.title", lang)}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            {t("landing.steps.intro", lang)}
          </p>
          <ol className="mt-10 grid gap-8 sm:mt-12 sm:gap-10 md:grid-cols-3 md:gap-8">
            <Step
              n="01"
              icon={<Sheet className="h-5 w-5" aria-hidden />}
              title={t("landing.step1.title", lang)}
              body={t("landing.step1.body", lang)}
            />
            <Step
              n="02"
              icon={<MessageCircle className="h-5 w-5" aria-hidden />}
              title={t("landing.step2.title", lang)}
              body={t("landing.step2.body", lang)}
            />
            <Step
              n="03"
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              title={t("landing.step3.title", lang)}
              body={t("landing.step3.body", lang)}
            />
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 md:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 80% 20%, rgba(15,92,76,0.18), transparent), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(26,122,100,0.12), transparent)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {t("landing.cta.title", lang)}
            </p>
            <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              {t("landing.cta.body", lang)}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-accent sm:w-auto"
          >
            {t("landing.cta.button", lang)}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-8 pb-28 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo size="sm" />
          <span className="text-xs sm:text-sm">{t("landing.footer.tagline", lang)}</span>
        </div>
      </footer>
    </main>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="group">
      <div className="flex items-center gap-3 text-primary">
        <span className="font-mono text-xs font-medium tracking-wider opacity-70">
          {n}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/15">
          {icon}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}

function ChatBubble({
  children,
  side,
  delay,
}: {
  children: ReactNode;
  side: "in" | "out";
  delay: string;
}) {
  return (
    <div
      className={
        side === "in"
          ? "landing-bubble max-w-[92%] rounded-2xl rounded-tl-md bg-[#1f2c26] px-3 py-2 text-[13px] leading-snug text-[#e8f0ec]"
          : "landing-bubble ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[#005c4b] px-3 py-2 text-[13px] leading-snug text-white"
      }
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}
