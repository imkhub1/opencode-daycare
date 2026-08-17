export default function KidsLoading() {
  return (
    <section aria-label="Cargando niños" className="mx-auto w-full max-w-[880px] animate-pulse px-5 py-8 pb-16 sm:px-10 sm:py-[34px]">
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2"><div className="h-3 w-20 rounded bg-[#eadaca]" /><div className="h-9 w-32 rounded bg-[#e4d4c2]" /></div>
        <div className="h-11 w-36 rounded-[14px] bg-[#efb09d]" />
      </div>
      <div className="mb-7 h-12 rounded-[14px] bg-surface" />
      {["Soles", "Lunas", "Estrellas"].map((room) => (
        <div key={room} className="mb-6">
          <div className="mb-3 h-4 w-40 rounded bg-[#e4d4c2]" />
          <div className="grid gap-3.5 sm:grid-cols-2">
            {[0, 1].map((item) => <div key={item} className="h-20 rounded-[18px] border border-line bg-surface" />)}
          </div>
        </div>
      ))}
    </section>
  );
}
