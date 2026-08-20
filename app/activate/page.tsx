import { getActivationPreview } from "@/app/activate/actions";
import { ActivateScreen } from "@/components/auth";
import { createClient } from "@/utils/supabase/server";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code = "" } = await searchParams;
  const preview = code ? await getActivationPreview(code) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getCurrentAppProfile();
  const authenticatedParent = Boolean(
    user &&
      preview &&
      profile?.role === "parent" &&
      (profile.status === "pending" || profile.status === "active") &&
      user.email?.toLowerCase() === preview.email.toLowerCase(),
  );
  const blockedSession = Boolean(user && preview && !authenticatedParent);

  return (
    <ActivateScreen
      token={code}
      preview={preview}
      authenticated={authenticatedParent}
      blockedSession={blockedSession}
    />
  );
}
