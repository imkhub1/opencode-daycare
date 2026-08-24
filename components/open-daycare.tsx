import Link from "next/link";
import type { ReactNode } from "react";

export { Icon, type IconName } from "@/components/shared/Icon";
import { POST_TYPE_LABELS, type FeedPost, type PostType } from "@/app/posts/types";
import { PostPhotoGallery } from "@/components/post-photo-gallery";

export function Avatar({ children, tone = "coral" }: { children: ReactNode; tone?: "coral" | "blue" }) {
  const colors = tone === "coral" ? "bg-[#f2937a] text-white" : "bg-[#a9d9e8] text-[#1f7a93]";
  return <span className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${colors}`}>{children}</span>;
}

const postStyle: Record<PostType, string> = {
  meal: "bg-[#f5ecd3] text-[#80651b]",
  nap: "bg-[#e7dcf6] text-[#7b5fc0]",
  activity: "bg-[#c7e7f1] text-[#2e89a6]",
  achievement: "bg-[#cfebd8] text-[#3e9b6c]",
  mood: "bg-[#f9d2de] text-[#c56486]",
  photo: "bg-[#fbd8cc] text-[#d9684a]",
  announcement: "bg-[#ccd8f4] text-[#4e72c8]",
};

function formatPostTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function initialFor(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase("es") || "U";
}

export function PostCard({ post }: { post: FeedPost }) {
  const audience = `Para: toda la sala ${post.roomName}`;
  const photoLabel = post.photos.length === 1 ? "1 foto" : `${post.photos.length} fotos`;

  return <article className="rounded-[20px] border border-line bg-surface p-5 shadow-sm shadow-[#785a3c]/10 sm:p-[22px]"><div className="mb-4 flex items-center gap-3"><Avatar tone="blue">{initialFor(post.authorName)}</Avatar><div className="min-w-0 flex-1"><h2 className="font-display text-[17px] font-semibold text-ink">{post.authorName}</h2><p className="text-xs text-[#a89a8b]">{formatPostTime(post.publishedAt)} · publicado por el equipo</p></div><span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wide ${postStyle[post.type]}`}><span className="size-2 rounded-full bg-current" />{POST_TYPE_LABELS[post.type]}</span></div><p className="mb-2.5 text-xs text-[#a89a8b]">{audience}</p><p className="text-[15.5px] leading-relaxed text-[#4a4038]">{post.body}</p>{post.photos.length > 0 && <PostPhotoGallery photos={post.photos} />}<div className="mt-4 flex items-center justify-between border-t border-[#f0e6d8] pt-3.5 text-xs font-bold text-muted"><span>{post.photos.length > 0 ? photoLabel : "Publicación de sala"}</span><span>{post.roomName}</span></div></article>;
}

export function PlaceholderPage({ title }: { title: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-sand px-5"><section className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-lg shadow-[#785a3c]/10"><p className="mb-2 text-xs font-extrabold tracking-widest text-coral">OPENDAYCARE</p><h1 className="font-display text-3xl font-semibold text-ink">{title}</h1><p className="mt-3 text-muted">Esta pantalla estará disponible próximamente.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-coral px-5 py-3 text-sm font-extrabold text-white">Volver al inicio</Link></section></main>;
}
