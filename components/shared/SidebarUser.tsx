"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function SidebarUser() {
  const [name, setName] = useState("Usuario");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const fallbackName = typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : user.email?.split("@")[0] ?? "Usuario";
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (active) setName(profile?.full_name?.trim() || fallbackName);
    }

    loadUser();
    return () => { active = false; };
  }, []);

  return <><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f2937a] font-display text-lg font-semibold text-white">{name.trim().charAt(0).toLocaleUpperCase("es") || "U"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-ink">{name}</p><p className="text-xs text-[#a89a8b]">Admin</p></div></>;
}
