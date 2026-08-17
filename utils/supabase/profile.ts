import "server-only";

import { cache } from "react";

import { createClient } from "@/utils/supabase/server";

export type AppProfile = {
  id: string;
  fullName: string;
  role: "staff" | "parent" | "admin";
  status: "pending" | "active";
};

export const getCurrentAppProfile = cache(async (): Promise<AppProfile | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, full_name, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw new Error("No se pudo cargar el perfil actual.");
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status,
  };
});
