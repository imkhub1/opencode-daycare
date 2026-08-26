import "server-only";

import { cookies } from "next/headers";

import {
  getDictionary,
  LOCALE_COOKIE,
  parseLocale,
  type Dictionary,
  type Locale,
} from "@/utils/i18n/dictionary";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getServerLocale());
}
