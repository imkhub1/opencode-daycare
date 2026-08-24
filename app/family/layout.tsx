import type { ReactNode } from "react";

import { FamilyShell } from "@/components/family/FamilyShell";
import { requireArea } from "@/utils/supabase/profile";

export default async function FamilyLayout({ children }: { children: ReactNode }) {
  const profile = await requireArea("family");

  return <FamilyShell profile={profile}>{children}</FamilyShell>;
}
