import type { Metadata } from "next";
import Link from "next/link";

import { getPostRooms } from "@/app/posts/queries";
import { CreatePost } from "@/components/create-post";
import { requireArea } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";

export const metadata: Metadata = {
  title: "Nueva publicación · OpenDayCare",
};

export default async function StaffCreatePostPage() {
  const profile = await requireArea("staff");
  const rooms = await getPostRooms(profile);
  const dictionary = await getServerDictionary();

  return (
    <main className="px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-[580px] flex-col items-start gap-5">
        <Link href="/staff" className="text-sm font-bold text-muted">
          <span aria-hidden="true">← </span>{dictionary.common.backToFeed}
        </Link>
        {rooms.length > 0 ? (
          <CreatePost rooms={rooms} variant="page" dictionary={dictionary} />
        ) : (
          <section className="w-full rounded-[24px] border border-line bg-surface p-7 text-center shadow-theme-md">
            <h1 className="font-display text-2xl font-semibold text-ink">{dictionary.kids.noRoomAssigned}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{dictionary.kids.noRoomAssignedDescription}</p>
          </section>
        )}
      </div>
    </main>
  );
}
