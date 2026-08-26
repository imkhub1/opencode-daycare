import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/shared/LogoutButton";
import { getCurrentAppProfile, getProfileDestination } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";

export default async function AccessPendingPage() {
  const profile = await getCurrentAppProfile();
  const destination = getProfileDestination(profile);
  const dictionary = await getServerDictionary();

  if (destination !== "/access-pending") redirect(destination);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-theme-md">
        <p className="mb-2 text-xs font-extrabold tracking-widest text-coral">OPENDAYCARE</p>
        <h1 className="font-display text-3xl font-semibold text-ink">{dictionary.pending.title}</h1>
        <p className="mt-3 text-muted">
          {dictionary.pending.description}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/" className="inline-flex rounded-xl bg-coral px-5 py-3 text-sm font-extrabold text-theme-white-strong">
            {dictionary.pending.reviewAccess}
          </Link>
          <LogoutButton>{dictionary.pending.logout}</LogoutButton>
        </div>
      </section>
    </main>
  );
}
