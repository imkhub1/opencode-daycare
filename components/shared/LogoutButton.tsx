"use client";

import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

export function LogoutButton({ children }: { children: ReactNode }) {
  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error.message);
      return;
    }

    window.location.href = new URL("/login", window.location.origin).href;
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Cerrar sesión"
      className="flex size-8 items-center justify-center rounded-lg bg-sand text-muted hover:text-coral"
    >
      {children}
    </button>
  );
}
