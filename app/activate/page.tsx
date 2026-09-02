import { ActivateScreen } from "@/components/auth";
import { createClient } from "@/utils/supabase/server";
import { getCurrentAppProfile } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";
import { getInvitationPreview } from "@/utils/supabase/invitation-preview";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  const codeValue = Array.isArray(code) ? code[0] ?? "" : code ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getCurrentAppProfile();
  const preview = user ? null : await getInvitationPreview(codeValue);
  const authenticatedParent = Boolean(
    user &&
      profile?.role === "parent" &&
      (profile.status === "pending" || profile.status === "active"),
  );

  return (
    <ActivateScreen
      key={codeValue}
      token={codeValue}
      authenticated={authenticatedParent}
      blockedSession={Boolean(user && !authenticatedParent)}
      preview={preview}
      dictionary={await getServerDictionary()}
    />
  );
}
