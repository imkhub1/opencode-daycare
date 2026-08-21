import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreatePost } from "@/components/create-post";
import { Brand } from "@/components/open-daycare";
import { getPostRooms } from "@/app/posts/queries";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

export const metadata: Metadata = {
  title: "Nueva publicación · OpenDayCare",
};

export default async function CreatePostPage() {
  const profile = await getCurrentAppProfile();
  const canCreatePost =
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin");

  if (!canCreatePost) redirect("/");

  const rooms = await getPostRooms(profile);

  return (
    <main className="min-h-screen bg-sand px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-[580px] flex-col items-start gap-5">
        <Link href="/" className="text-sm font-bold text-muted">
          <span aria-hidden="true">← </span>Volver al feed
        </Link>
        <div className="w-full px-1"><Brand /></div>
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
