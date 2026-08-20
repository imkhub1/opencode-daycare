import { ActivateScreen } from "@/components/auth";
import { createClient } from "@/utils/supabase/server";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code = "" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getCurrentAppProfile();
  const authenticatedParent = Boolean(
    user &&
      profile?.role === "parent" &&
      (profile.status === "pending" || profile.status === "active"),
  );

  return (
    <ActivateScreen
      token={code}
      authenticated={authenticatedParent}
      blockedSession={Boolean(user && !authenticatedParent)}
    />
  );
}
