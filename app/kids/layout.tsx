import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { KidsReadError } from "@/components/kids";
import { MobileNavigation, Sidebar } from "@/components/open-daycare";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

function KidsShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sand md:flex">
      <Sidebar activeHref="/kids" />
      <div className="min-w-0 flex-1">
        <MobileNavigation activeHref="/kids" />
        <main>{children}</main>
      </div>
    </div>
  );
}

export default async function KidsLayout({ children }: { children: ReactNode }) {
  let profile;
  try {
    profile = await getCurrentAppProfile();
  } catch {
    return <KidsShell><KidsReadError /></KidsShell>;
  }

  const allowed =
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin");

  if (!allowed) redirect("/");

  return <KidsShell>{children}</KidsShell>;
}
