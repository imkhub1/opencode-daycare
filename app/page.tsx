import { redirect } from "next/navigation";

import { getCurrentAppProfile, getProfileDestination } from "@/utils/supabase/profile";

export default async function Home() {
  const profile = await getCurrentAppProfile();
  redirect(getProfileDestination(profile));
}
