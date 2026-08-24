import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export type AppProfile = {
  id: string;
  fullName: string;
  role: "staff" | "parent" | "admin" | null;
  status: "pending" | "active" | null;
  email: string | null;
};

export type AppArea = "staff" | "family";

export function getProfileDestination(profile: AppProfile | null) {
  if (profile?.status !== "active") return "/access-pending";
  if (profile.role === "staff" || profile.role === "admin") return "/staff";
  if (profile.role === "parent") return "/family";
  return "/access-pending";
}

export function isAreaProfile(profile: AppProfile | null, area: AppArea) {
  if (profile?.status !== "active") return false;

  return area === "staff"
    ? profile.role === "staff" || profile.role === "admin"
    : profile.role === "parent";
}

export const getCurrentAppProfile = cache(async (): Promise<AppProfile | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (userError || !user || typeof userId !== "string") return null;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, role, status")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      const displayName =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name.trim()
          : "";

      return {
        id: user.id,
        fullName: displayName || user.email || "Usuario",
        role: null,
        status: null,
        email: user.email ?? null,
      };
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireArea(area: AppArea) {
  const profile = await getCurrentAppProfile();

  if (!isAreaProfile(profile, area)) redirect(getProfileDestination(profile));

  return profile!;
}
