import { redirect } from "next/navigation";

import {
  getCurrentAppProfile,
  getProfileDestination,
  isAreaProfile,
} from "@/utils/supabase/profile";

export default async function LegacyKidsPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [profile, { path = [] }, { view }] = await Promise.all([
    getCurrentAppProfile(),
    params,
    searchParams,
  ]);

  if (!isAreaProfile(profile, "staff")) redirect(getProfileDestination(profile));

  const suffix = path.map(encodeURIComponent).join("/");

  if (suffix) redirect(`/staff/kids/${suffix}`);

  redirect(view === "archived" ? "/staff/kids?view=archived" : "/staff/kids");
}
