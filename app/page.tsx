import Link from "next/link";
import { Avatar, Icon, MobileNavigation, PostCard, Sidebar } from "@/components/open-daycare";

const posts = [
  { type: "LOGRO" as const, time: "14:20", audience: "Para: familia de Mateo", body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.", reactions: 3, comments: 1 },
  { type: "ACTIVIDAD" as const, time: "09:40", audience: "Para: familia de Mateo", body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.", reactions: 5, comments: 2, photo: "Foto · pintando con témperas" },
  { type: "ANUNCIO" as const, time: "07:50", audience: "Para: toda la sala", body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.", reactions: 8, comments: 0 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-sand md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <MobileNavigation />
        <main className="mx-auto max-w-[760px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
          <header className="mb-6">
            <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">GUARDERÍA · SALA SOLES</p>
            <h1 className="font-display text-3xl font-semibold text-ink">Buenas, Caro</h1>
            <p className="mt-1 text-sm text-muted">12 niños · martes 17 jun</p>
          </header>
          <Link href="/crear-publicacion" className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4 py-3.5 shadow-sm shadow-[#785a3c]/10">
            <Avatar>C</Avatar>
            <span className="flex-1 text-[15px] text-[#a89a8b]">Compartí un momento…</span>
            <span className="flex size-10 items-center justify-center rounded-xl bg-coral-soft text-coral"><Icon name="camera" className="size-5" /></span>
          </Link>
          <div className="mb-3.5 flex items-center gap-3.5"><span className="text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">PUBLICADO HOY</span><span className="h-px flex-1 bg-[#e7dac8]" /></div>
          <div className="flex flex-col gap-4">{posts.map((post) => <PostCard key={post.type} post={post} />)}</div>
        </main>
      </div>
    </div>
  );
}
