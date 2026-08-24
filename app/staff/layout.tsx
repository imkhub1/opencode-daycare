import type { ReactNode } from "react";

import { StaffShell } from "@/components/staff/StaffShell";
import { requireArea } from "@/utils/supabase/profile";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireArea("staff");

  return <StaffShell profile={profile}>{children}</StaffShell>;
}
