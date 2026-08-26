"use client";

import type { AppProfile } from "@/utils/supabase/profile";
import { useLocale } from "@/components/shared/LocaleProvider";

export function SidebarUser({
  profile,
}: {
  profile: Pick<AppProfile, "fullName" | "role">;
}) {
  const { locale, dictionary } = useLocale();
  const name = profile.fullName.trim() || dictionary.navigation.account;
  const role = profile.role
    ? dictionary.navigation[profile.role === "admin" ? "admin" : profile.role === "staff" ? "staff" : "family"]
    : dictionary.navigation.account;
  const initial = name.charAt(0).toLocaleUpperCase(locale);

  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f2937a] font-display text-lg font-semibold text-white"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink">{name}</p>
        <p className="text-xs text-[#a89a8b]">{role}</p>
      </div>
    </>
  );
}
