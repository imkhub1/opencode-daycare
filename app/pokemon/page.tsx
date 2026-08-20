import Link from "next/link";

import { PokemonBrowser } from "@/components/pokemon-browser";

export default function PokemonPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-5 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-5 inline-flex text-sm font-extrabold text-[#c5503a] hover:underline">← Volver al feed</Link>
        <PokemonBrowser />
      </div>
    </main>
  );
}
