import { notFound, redirect } from "next/navigation";

import { getCurrentAppProfile, getProfileDestination } from "@/utils/supabase/profile";

export default async function PlaceholderRoute({ params }: { params: Promise<{ placeholder: string[] }> }) {
  const { placeholder } = await params;
  if (placeholder[0] === "ninos") notFound();

  const profile = await getCurrentAppProfile();
  redirect(getProfileDestination(profile));
}
