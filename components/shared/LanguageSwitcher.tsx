"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/utils/i18n/actions";
import type { Locale } from "@/utils/i18n/dictionary";
import { useLocale } from "@/components/shared/LocaleProvider";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, dictionary } = useLocale();
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale || isPending) return;

    const formData = new FormData();
    formData.set("locale", nextLocale);
    startTransition(() => {
      void setLocale(formData).then(() => {
        const query = searchParams.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`);
      });
    });
  }

  return (
    <div
      aria-label={dictionary.language.label}
      className={`inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-extrabold ${className}`}
    >
      <button
        type="button"
        onClick={() => changeLocale("es")}
        aria-pressed={locale === "es"}
        aria-label={dictionary.language.switchToSpanish}
        disabled={isPending}
        className={`rounded-lg px-2.5 py-1.5 transition ${locale === "es" ? "bg-ink text-canvas" : "text-nav hover:bg-sand"}`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => changeLocale("en")}
        aria-pressed={locale === "en"}
        aria-label={dictionary.language.switchToEnglish}
        disabled={isPending}
        className={`rounded-lg px-2.5 py-1.5 transition ${locale === "en" ? "bg-ink text-canvas" : "text-nav hover:bg-sand"}`}
      >
        EN
      </button>
    </div>
  );
}
