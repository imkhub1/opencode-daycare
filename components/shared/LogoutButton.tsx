"use client";

import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { markLogoutHistory } from "@/components/shared/logout-history";

export function LogoutButton({ children }: { children: ReactNode }) {
  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error.message);
      return;
    }

    markLogoutHistory();
    window.location.replace(new URL("/login", window.location.origin).href);
  }

  const iconOnly = typeof children !== "string";

  return <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" className={iconOnly ? "flex size-8 items-center justify-center rounded-lg bg-sand text-muted hover:text-coral" : "inline-flex rounded-xl border border-line px-5 py-3 text-sm font-extrabold text-muted hover:text-coral"}>{children}</button>;
}
