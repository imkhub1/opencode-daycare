"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/utils/i18n/dictionary";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
