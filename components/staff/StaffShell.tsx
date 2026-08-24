import type { ReactNode } from "react";

import { AppShell, type AreaNavigationItem } from "@/components/shared/AppShell";
import type { AppProfile } from "@/utils/supabase/profile";

const navigation: AreaNavigationItem[] = [
  { href: "/staff", label: "Feed", icon: "home" },
  { href: "/staff/crear-publicacion", label: "Nueva publicación", icon: "plus" },
  { href: "/staff/kids", label: "Niños", icon: "users" },
];

export function StaffShell({
  profile,
  children,
}: {
  profile: Pick<AppProfile, "fullName" | "role">;
  children: ReactNode;
}) {
  return <AppShell profile={profile} navigation={navigation} brandSubtitle="Sala Soles">{children}</AppShell>;
}
