"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { AppProfile } from "@/utils/supabase/profile";

const AppProfileContext = createContext<AppProfile | null>(null);

export function AppProfileProvider({
  profile,
  children,
}: {
  profile: AppProfile | null;
  children: ReactNode;
}) {
  return <AppProfileContext.Provider value={profile}>{children}</AppProfileContext.Provider>;
}

export function useAppProfile() {
  return useContext(AppProfileContext);
}

export function StaffNavigationOnly({ children }: { children: ReactNode }) {
  const profile = useAppProfile();
  const allowed =
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin");

  return allowed ? children : null;
}
