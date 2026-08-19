import { getActivationPreview } from "@/app/activate/actions";
import { ActivateScreen } from "@/components/auth";
import { createClient } from "@/utils/supabase/server";

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

  return <ActivateScreen token={code} preview={preview} authenticated={Boolean(user)} />;
}
