import type { ReactNode } from "react";

import { AppShell, type AreaNavigationItem } from "@/components/shared/AppShell";
import type { AppProfile } from "@/utils/supabase/profile";

const navigation: AreaNavigationItem[] = [
  { href: "/family", label: "Inicio", icon: "home" },
];

export function FamilyShell({
  profile,
  children,
}: {
  profile: Pick<AppProfile, "fullName" | "role">;
  children: ReactNode;
}) {
  return <AppShell profile={profile} navigation={navigation} brandSubtitle="Familias">{children}</AppShell>;
}
