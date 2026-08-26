import type { ReactNode } from "react";

import { AppShell, type AreaNavigationItem } from "@/components/shared/AppShell";
import type { AppProfile } from "@/utils/supabase/profile";

const navigation: AreaNavigationItem[] = [
  { href: "/staff", label: "feed", icon: "home" },
  { href: "/staff/kids", label: "kids", icon: "users" },
];

const primaryAction: AreaNavigationItem = {
  href: "/staff/crear-publicacion",
  label: "newPost",
  icon: "plus",
};

export function StaffShell({
  profile,
  children,
}: {
  profile: Pick<AppProfile, "fullName" | "role">;
  children: ReactNode;
}) {
  return (
    <AppShell
      profile={profile}
      navigation={navigation}
      primaryAction={primaryAction}
      brandSubtitle="staffSubtitle"
    >
      {children}
    </AppShell>
  );
}
