import { redirect } from "next/navigation";

import { getCurrentAppProfile, getProfileDestination, isAreaProfile } from "@/utils/supabase/profile";

export default async function CreatePostPage() {
  const profile = await getCurrentAppProfile();
  redirect(
    isAreaProfile(profile, "staff")
      ? "/staff/crear-publicacion"
      : getProfileDestination(profile),
  );
}
