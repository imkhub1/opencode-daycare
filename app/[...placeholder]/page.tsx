import { redirect } from "next/navigation";

import { getCurrentAppProfile, getProfileDestination } from "@/utils/supabase/profile";

export default async function PlaceholderRoute({ params }: { params: Promise<{ placeholder: string[] }> }) {
  void params;
  const profile = await getCurrentAppProfile();
  redirect(getProfileDestination(profile));
}
