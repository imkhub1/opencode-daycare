import type { Metadata } from "next";
import Link from "next/link";

import { getPostRooms } from "@/app/posts/queries";
import { CreatePost } from "@/components/create-post";
import { requireArea } from "@/utils/supabase/profile";

export const metadata: Metadata = {
  title: "Nueva publicación · OpenDayCare",
};

export default async function StaffCreatePostPage() {
  const profile = await requireArea("staff");
  const rooms = await getPostRooms(profile);

  return (
    <main className="px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-[580px] flex-col items-start gap-5">
        <Link href="/staff" className="text-sm font-bold text-muted">
          <span aria-hidden="true">← </span>Volver al feed
        </Link>
        {rooms.length > 0 ? (
          <CreatePost rooms={rooms} variant="page" />
        ) : (
          <section className="w-full rounded-[24px] border border-line bg-surface p-7 text-center shadow-lg shadow-[#785a3c]/10">
            <h1 className="font-display text-2xl font-semibold text-ink">No tenés una sala asignada</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">Pedile a un administrador que te asigne una sala para poder publicar.</p>
          </section>
        )}
      </div>
    </main>
  );
}
