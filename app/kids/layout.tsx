import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentAppProfile, getProfileDestination, isAreaProfile } from "@/utils/supabase/profile";

export default async function KidsLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentAppProfile();

  if (!isAreaProfile(profile, "staff")) redirect(getProfileDestination(profile));

  return children;
}
