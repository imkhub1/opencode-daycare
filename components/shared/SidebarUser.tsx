"use client";

import type { AppProfile } from "@/utils/supabase/profile";

const roleLabels = {
  admin: "Admin",
  staff: "Personal",
  parent: "Familia",
} as const;

export function SidebarUser({
  profile,
}: {
  profile: Pick<AppProfile, "fullName" | "role">;
}) {
  const name = profile.fullName.trim() || "Usuario";
  const role = profile.role ? roleLabels[profile.role] : "Cuenta";
  const initial = (Array.from(name)[0] || "U").toLocaleUpperCase("es");

  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-lg font-semibold text-theme-white-strong"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink">{name}</p>
        <p className="text-xs text-subtle">{role}</p>
      </div>
    </>
  );
}
