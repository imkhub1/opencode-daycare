"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent } from "react";

import { CreatePost } from "@/components/create-post";
import {
  Avatar,
  Icon,
  MobileNavigation,
  PostCard,
  Sidebar,
} from "@/components/open-daycare";
import type { FeedPost, PostRoom } from "@/app/posts/types";

export function FeedClient({
  posts,
  rooms,
  displayName,
  canCreatePost,
}: {
  posts: FeedPost[];
  rooms: PostRoom[];
  displayName: string;
  canCreatePost: boolean;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstName = displayName.trim().split(/\s+/)[0] || "equipo";
  const roomName = rooms.length === 1 ? rooms[0].name : posts[0]?.roomName;
  const headerLabel = roomName ? `GUARDERÍA · SALA ${roomName.toUpperCase()}` : "GUARDERÍA · FEED";

  function openCreate(event: MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setIsCreateOpen(true);
  }

  function closeCreate() {
    setIsCreateOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handlePublished() {
    setIsCreateOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-sand md:flex">
      <Sidebar onCreatePost={canCreatePost ? openCreate : undefined} />
      <div className="min-w-0 flex-1">
        <MobileNavigation onCreatePost={canCreatePost ? openCreate : undefined} />
        <main className="mx-auto max-w-[760px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
          <header className="mb-6">
            <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">{headerLabel}</p>
            <h1 className="font-display text-3xl font-semibold text-ink">Buenas, {firstName}</h1>
            <p className="mt-1 text-sm text-muted">Las novedades de tu comunidad</p>
          </header>

          {canCreatePost && (
            <button
              type="button"
              onClick={openCreate}
              className="mb-6 flex w-full items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4 py-3.5 text-left shadow-sm shadow-[#785a3c]/10"
            >
              <Avatar>{firstName.charAt(0).toLocaleUpperCase("es")}</Avatar>
              <span className="flex-1 text-[15px] text-[#a89a8b]">Compartí un momento…</span>
              <span className="flex size-10 items-center justify-center rounded-xl bg-coral-soft text-coral">
                <Icon name="camera" className="size-5" />
              </span>
            </button>
          )}

          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">PUBLICACIONES</span>
            <span className="h-px flex-1 bg-[#e7dac8]" />
          </div>

          {posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          ) : (
            <section className="rounded-[20px] border border-dashed border-[#dbcdba] bg-surface px-6 py-12 text-center">
              <Icon name="megaphone" className="mx-auto mb-3 size-8 text-[#c8b8a4]" />
              <h2 className="font-display text-xl font-semibold text-ink">Todavía no hay publicaciones</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                Las novedades de tu sala aparecerán acá cuando el equipo comparta un momento.
              </p>
            </section>
          )}
        </main>
      </div>
      {isCreateOpen && (
        <CreatePost rooms={rooms} onCancel={closeCreate} onSuccess={handlePublished} />
      )}
    </div>
  );
}
