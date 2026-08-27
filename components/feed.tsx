"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent } from "react";

import { CreatePost } from "@/components/create-post";
import { Avatar, Icon, PostCard } from "@/components/open-daycare";
import type { FeedPost, PostRoom } from "@/app/posts/types";
import { interpolate, type Dictionary } from "@/utils/i18n/dictionary";

export function FeedClient({
  posts,
  rooms,
  displayName,
  canCreatePost,
  currentUserId,
  canDeleteAnyPost,
  dictionary,
}: {
  posts: FeedPost[];
  rooms: PostRoom[];
  displayName: string;
  canCreatePost: boolean;
  currentUserId: string;
  canDeleteAnyPost: boolean;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openFilePickerOnMount, setOpenFilePickerOnMount] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstName = displayName.trim().split(/\s+/)[0] || dictionary.feed.team;
  const roomName = rooms.length === 1 ? rooms[0].name : posts[0]?.roomName;
  const headerLabel = roomName
    ? interpolate(dictionary.feed.daycareRoom, { room: roomName.toLocaleUpperCase(dictionary.locale) })
    : dictionary.feed.daycareFeed;

  function openCreate(event: MouseEvent<HTMLButtonElement>, withPhotoPicker = false) {
    triggerRef.current = event.currentTarget;
    setOpenFilePickerOnMount(withPhotoPicker);
    setIsCreateOpen(true);
  }

  function closeCreate() {
    setIsCreateOpen(false);
    setOpenFilePickerOnMount(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handlePublished() {
    setIsCreateOpen(false);
    setOpenFilePickerOnMount(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
    router.refresh();
  }

  return (
    <>
      <main className="mx-auto max-w-[760px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
        <header className="mb-6">
          <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-coral-deep">{headerLabel}</p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {interpolate(dictionary.feed.greeting, { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-muted">{dictionary.feed.updates}</p>
        </header>

        {canCreatePost && (
          <div className="motion-card motion-composite mb-6 flex w-full items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4 py-3.5 text-left shadow-theme-sm">
            <button
              type="button"
              onClick={openCreate}
              className="motion-composite-child flex min-w-0 flex-1 items-center gap-3.5 rounded-lg text-left"
            >
              <Avatar>{firstName.charAt(0).toLocaleUpperCase("es")}</Avatar>
              <span className="min-w-0 flex-1 text-[15px] text-subtle">{dictionary.feed.shareMoment}</span>
            </button>
            <button
              type="button"
              onClick={(event) => openCreate(event, true)}
              aria-label={dictionary.feed.addPhotoToPost}
              title={dictionary.feed.addPhotoToPost}
              className="motion-composite-child flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-coral"
            >
              <Icon name="camera" className="size-5" />
            </button>
          </div>
        )}

        <div className="mb-3.5 flex items-center gap-3.5">
          <span className="text-xs font-extrabold tracking-[0.08em] text-subtle-strong">{dictionary.feed.publications}</span>
          <span className="h-px flex-1 bg-line-soft" />
        </div>

        {posts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canDelete={canDeleteAnyPost || post.authorId === currentUserId}
                dictionary={dictionary}
              />
            ))}
          </div>
        ) : (
          <section className="rounded-[20px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <Icon name="megaphone" className="mx-auto mb-3 size-8 text-graphic" />
            <h2 className="font-display text-xl font-semibold text-ink">{dictionary.feed.noPostsTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              {dictionary.feed.noPostsDescription}
            </p>
          </section>
        )}
      </main>
      {isCreateOpen && (
        <CreatePost
          rooms={rooms}
          openFilePickerOnMount={openFilePickerOnMount}
          onCancel={closeCreate}
          onSuccess={handlePublished}
        />
      )}
    </>
  );
}
