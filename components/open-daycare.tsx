import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { SidebarUser } from "@/components/shared/SidebarUser";

type IconName = "bell" | "camera" | "heart" | "home" | "image" | "log-out" | "megaphone" | "menu" | "message" | "plus" | "sun" | "user" | "users";

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />,
    home: <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" /></>,
    "log-out": <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    megaphone: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    message: <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    users: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9" /></>,
  };

  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Brand() {
  return <Link href="/" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-[#f8c3a8] to-[#f2937a] text-white"><Icon name="sun" className="size-5" /></span><span><span className="block font-display text-lg font-semibold leading-none text-ink">OpenDayCare</span><span className="mt-1 block text-xs text-[#a89a8b]">Sala Soles</span></span></Link>;
}

export function Avatar({ children, tone = "coral" }: { children: ReactNode; tone?: "coral" | "blue" }) {
  const colors = tone === "coral" ? "bg-[#f2937a] text-white" : "bg-[#a9d9e8] text-[#1f7a93]";
  return <span className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${colors}`}>{children}</span>;
}

const navItems: { href: string; label: string; icon: IconName }[] = [{ href: "/", label: "Feed", icon: "home" }, { href: "/kids", label: "Niños", icon: "users" }, { href: "/avisos", label: "Avisos", icon: "bell" }, { href: "/mi-cuenta", label: "Mi cuenta", icon: "user" }];

function NavLinks({ activeHref = "/", compact = false }: { activeHref?: string; compact?: boolean }) {
  return <nav className={compact ? "flex flex-col gap-1" : "flex flex-1 flex-col gap-1"}>{navItems.map((item) => <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${item.href === activeHref ? "bg-coral-soft text-[#d9583c]" : "text-[#6e6359] hover:bg-[#f6ecdf]"}`}><Icon name={item.icon} className="size-5" />{item.label}</Link>)}</nav>;
}

export function Sidebar({ activeHref = "/", onCreatePost }: { activeHref?: string; onCreatePost?: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex"><div className="px-2 pb-6"><Brand /></div><button onClick={onCreatePost} className="mb-5 flex items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#ee8164]/25"><Icon name="plus" className="size-[17px]" />Nueva publicación</button><NavLinks activeHref={activeHref} /><div className="mt-3 border-t border-line pt-4"><div className="flex items-center gap-3 px-2"><SidebarUser /><LogoutButton><Icon name="log-out" className="size-4" /></LogoutButton></div></div></aside>;
}

export function MobileNavigation({ activeHref = "/", onCreatePost }: { activeHref?: string; onCreatePost?: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden"><div className="flex items-center justify-between"><Brand /><div className="flex items-center gap-2"><button onClick={onCreatePost} className="flex items-center gap-1.5 rounded-xl bg-coral px-3 py-2 text-xs font-extrabold text-white"><Icon name="plus" className="size-4" />Nueva publicación</button><details className="relative"><summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl bg-sand text-ink"><Icon name="menu" className="size-5" /><span className="sr-only">Abrir navegación</span></summary><div className="absolute right-0 top-12 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-[#3f362e]/10"><NavLinks activeHref={activeHref} compact /></div></details></div></div></header>;
}

export type PostType = "COMIDA" | "SIESTA" | "ACTIVIDAD" | "LOGRO" | "ÁNIMO" | "FOTO" | "ANUNCIO";
export type FeedPost = { id: string; type: PostType; time: string; body: string; audience: string; reactions: number; comments: number; photo?: string; photos?: { id: string; file: File; previewUrl: string }[] };
const postStyle: Record<PostType, string> = { COMIDA: "bg-[#f5ecd3] text-[#80651b]", SIESTA: "bg-[#e7dcf6] text-[#7b5fc0]", ACTIVIDAD: "bg-[#c7e7f1] text-[#2e89a6]", LOGRO: "bg-[#cfebd8] text-[#3e9b6c]", ÁNIMO: "bg-[#f9d2de] text-[#c56486]", FOTO: "bg-[#fbd8cc] text-[#d9684a]", ANUNCIO: "bg-[#ccd8f4] text-[#4e72c8]" };

export function PostCard({ post }: { post: FeedPost }) {
  const announcement = post.type === "ANUNCIO";
  const detailHref = post.type === "ACTIVIDAD" ? "/publicaciones/mateo-actividad" : "/publicaciones/mateo-logro";
  return <article className="rounded-[20px] border border-line bg-surface p-5 shadow-sm shadow-[#785a3c]/10 sm:p-[22px]"><div className="mb-4 flex items-center gap-3">{announcement ? <span className="flex size-11 items-center justify-center rounded-full bg-[#ccd8f4] text-[#4e72c8]"><Icon name="megaphone" className="size-5" /></span> : <Avatar tone="blue">M</Avatar>}<div className="min-w-0 flex-1"><h2 className="font-display text-[17px] font-semibold text-ink">{announcement ? "Anuncio general" : "Mateo"}</h2><p className="text-xs text-[#a89a8b]">{post.time} · publicado por vos</p></div><span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wide ${postStyle[post.type]}`}><span className="size-2 rounded-full bg-current" />{post.type}</span></div><p className="mb-2.5 text-xs text-[#a89a8b]">{post.audience}</p><p className="text-[15.5px] leading-relaxed text-[#4a4038]">{post.body}</p>{post.photo && <Link href="/fotos/mateo-temperas" className="mt-4 flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#dbcdba] bg-[#f4ece1] text-[#b0a290]"><Icon name="image" className="size-8" /><span className="text-sm">{post.photo}</span></Link>}{post.photos && <div className={`mt-4 grid gap-2 ${post.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.photos.map((photo) => <div key={photo.id} className="relative h-40 w-full overflow-hidden rounded-xl"><Image src={photo.previewUrl} alt={photo.file.name} fill sizes="(max-width: 640px) 100vw, 320px" unoptimized className="object-cover" /></div>)}</div>}<div className="mt-4 flex items-center gap-5 border-t border-[#f0e6d8] pt-3.5"><span className="flex items-center gap-2 text-sm font-bold text-coral"><Icon name="heart" className="size-5 fill-current" />{post.reactions}</span><Link href={detailHref} className="flex items-center gap-2 text-sm font-bold text-muted"><Icon name="message" className="size-[18px]" />{post.comments}</Link><span className="flex-1" /><Link href="/crear-publicacion" className="text-sm font-extrabold text-[#c5503a]">Editar</Link></div></article>;
}

export function PlaceholderPage({ title }: { title: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-sand px-5"><section className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-lg shadow-[#785a3c]/10"><div className="mx-auto mb-6 w-fit"><Brand /></div><p className="mb-2 text-xs font-extrabold tracking-widest text-coral">OPENDAYCARE</p><h1 className="font-display text-3xl font-semibold text-ink">{title}</h1><p className="mt-3 text-muted">Esta pantalla estará disponible próximamente.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-coral px-5 py-3 text-sm font-extrabold text-white">Volver al feed</Link></section></main>;
}
