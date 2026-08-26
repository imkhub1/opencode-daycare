import Link from "next/link";
import type { ReactNode } from "react";

export { Icon, type IconName } from "@/components/shared/Icon";
import { POST_TYPE_LABELS, type FeedPost, type PostType } from "@/app/posts/types";
import { DeletePostButton } from "@/components/delete-post-button";
import { PostPhotoGallery } from "@/components/post-photo-gallery";

export function Avatar({ children, tone = "coral" }: { children: ReactNode; tone?: "coral" | "blue" }) {
  const colors = tone === "coral" ? "bg-brand-gradient text-theme-white-strong" : "bg-avatar-blue text-avatar-blue-ink";
  return <span className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${colors}`}>{children}</span>;
}

const postStyle: Record<PostType, string> = {
  meal: "bg-tag-meal text-tag-meal-ink",
  nap: "bg-tag-nap text-tag-nap-ink",
  activity: "bg-tag-activity text-tag-activity-ink",
  achievement: "bg-tag-achievement text-tag-achievement-ink",
  mood: "bg-tag-mood text-tag-mood-ink",
  photo: "bg-tag-photo text-tag-photo-ink",
  announcement: "bg-tag-announcement text-tag-announcement-ink",
};

function formatPublicationDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function initialFor(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase("es") || "U";
}

export function PostCard({ post, canDelete = false }: { post: FeedPost; canDelete?: boolean }) {
  const audience = `Para: toda la sala ${post.roomName}`;
  const photoLabel = post.photos.length === 1 ? "1 foto" : `${post.photos.length} fotos`;

  return (
    <article className="rounded-[20px] border border-line bg-surface p-5 shadow-theme-sm sm:p-[22px]">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <Avatar tone="blue">{initialFor(post.authorName)}</Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-semibold text-ink">{post.authorName}</h2>
          <p className="text-xs text-subtle">
            <time dateTime={post.publishedAt}>{formatPublicationDate(post.publishedAt)}</time> · publicado por el equipo
          </p>
        </div>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wide ${postStyle[post.type]}`}>
            <span className="size-2 rounded-full bg-current" />
            {POST_TYPE_LABELS[post.type]}
          </span>
          {canDelete && <DeletePostButton postId={post.id} />}
        </div>
      </div>
      <p className="mb-2.5 text-xs text-subtle">{audience}</p>
      <p className="text-[15.5px] leading-relaxed text-body">{post.body}</p>
      {post.photos.length > 0 && <PostPhotoGallery photos={post.photos} />}
      <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3.5 text-xs font-bold text-muted">
        <span>{post.photos.length > 0 ? photoLabel : "Publicación de sala"}</span>
        <span>{post.roomName}</span>
      </div>
    </article>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-sand px-5"><section className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-theme-md"><p className="mb-2 text-xs font-extrabold tracking-widest text-coral">OPENDAYCARE</p><h1 className="font-display text-3xl font-semibold text-ink">{title}</h1><p className="mt-3 text-muted">Esta pantalla estará disponible próximamente.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-coral px-5 py-3 text-sm font-extrabold text-theme-white-strong">Volver al inicio</Link></section></main>;
}
