"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/open-daycare";

type Kid = {
  id: string;
  name: string;
  detail: string;
  initial: string;
  avatar: string;
  badge?: string;
  badgeClass?: string;
};
type Room = "Soles" | "Lunita";
type AddedKid = { id: string; name: string; birthDate: string; room: Room };
type AddKidForm = {
  name: string;
  birthDate: string;
  room: Room;
  allergies: string;
  medicalNotes: string;
};
type FormErrors = Partial<Record<"name" | "birthDate" | "room", string>>;

const kids: Kid[] = [
  {
    id: "mateo-fernandez",
    name: "Mateo Fernández",
    detail: "3 años · 2 padres vinculados",
    initial: "M",
    avatar: "bg-[#a9d9e8] text-[#1f7a93]",
    badge: "MANÍ",
    badgeClass: "bg-[#fbd8cc] text-[#d9684a]",
  },
  {
    id: "sofia-mendez",
    name: "Sofía Méndez",
    detail: "2 años · 1 padre vinculado",
    initial: "S",
    avatar: "bg-[#f4b8cc] text-[#c44a7a]",
  },
  {
    id: "benjamin-ruiz",
    name: "Benjamín Ruiz",
    detail: "3 años · 2 padres vinculados",
    initial: "B",
    avatar: "bg-[#b9dec4] text-[#3e8b62]",
  },
  {
    id: "valentina-soto",
    name: "Valentina Soto",
    detail: "2 años · sin padres vinculados",
    initial: "V",
    avatar: "bg-[#f4dc8e] text-[#9a7b1e]",
    badge: "VINCULAR",
    badgeClass: "bg-[#f9d2de] text-[#c56486]",
  },
  {
    id: "tomas-diaz",
    name: "Tomás Díaz",
    detail: "3 años · 1 padre vinculado",
    initial: "T",
    avatar: "bg-[#c9b6e8] text-[#7b5fc0]",
    badge: "LACTOSA",
    badgeClass: "bg-[#fbd8cc] text-[#d9684a]",
  },
  {
    id: "emma-castro",
    name: "Emma Castro",
    detail: "2 años · 1 padre vinculado",
    initial: "E",
    avatar: "bg-[#f4b8cc] text-[#c44a7a]",
  },
  {
    id: "lucas-romero",
    name: "Lucas Romero",
    detail: "3 años · 1 padre vinculado",
    initial: "L",
    avatar: "bg-[#a9d9e8] text-[#1f7a93]",
  },
  {
    id: "olivia-vega",
    name: "Olivia Vega",
    detail: "2 años · 1 padre vinculado",
    initial: "O",
    avatar: "bg-[#b9dec4] text-[#3e8b62]",
  },
];

function InitialAvatar({
  initial,
  className,
  large = false,
}: {
  initial: string;
  className: string;
  large?: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${large ? "size-[84px] text-[34px]" : "size-12 text-[19px]"} ${className}`}
    >
      {initial}
    </span>
  );
}

function BackLink({
  href = "/kids",
  children = "Volver a Niños",
}: {
  href?: string;
  children?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-5 flex items-center gap-1.5 text-sm font-bold text-muted"
    >
      <svg
        aria-hidden="true"
        className="size-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}

const emptyForm = (): AddKidForm => ({
  name: "",
  birthDate: "",
  room: "Soles",
  allergies: "",
  medicalNotes: "",
});

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join("/");
}

function isPastDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    /^\d{2}\/\d{2}\/\d{4}$/.test(value) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date < today
  );
}

function ageFromBirthDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  )
    age--;
  return `${age} ${age === 1 ? "año" : "años"}`;
}

function KidCard({ kid }: { kid: Kid | AddedKid }) {
  const className =
    "flex min-w-0 items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 shadow-sm shadow-[#785a3c]/10";
  if ("birthDate" in kid)
    return (
      <article className={className}>
        <InitialAvatar
          initial={kid.name.trim().charAt(0).toUpperCase()}
          className="bg-[#f4dc8e] text-[#9a7b1e]"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold text-ink">
            {kid.name}
          </span>
          <span className="mt-0.5 block text-[13px] text-[#a89a8b]">
            {ageFromBirthDate(kid.birthDate)} · sin padres vinculados
          </span>
        </span>
      </article>
    );
  const content = (
    <>
      <InitialAvatar initial={kid.initial} className={kid.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-semibold text-ink">
          {kid.name}
        </span>
        <span className="mt-0.5 block text-[13px] text-[#a89a8b]">
          {kid.detail}
        </span>
      </span>
      {kid.badge && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${kid.badgeClass}`}
        >
          {kid.badge}
        </span>
      )}
    </>
  );
  return kid.id === "mateo-fernandez" ? (
    <Link
      href="/kids/mateo-fernandez"
      className={`${className} transition-colors hover:bg-[#fffaf3]`}
    >
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function ChildrenDirectory() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [addedKids, setAddedKids] = useState<AddedKid[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function closeDialog() {
    setIsOpen(false);
    setForm(emptyForm());
    setErrors({});
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;
    nameRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function saveKid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = "Ingresa el nombre completo.";
    if (!isPastDate(form.birthDate))
      nextErrors.birthDate = "Ingresa una fecha de nacimiento válida y pasada.";
    if (!form.room) nextErrors.room = "Selecciona una sala.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus();
      else document.getElementById("birthDate")?.focus();
      return;
    }
    setAddedKids((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        birthDate: form.birthDate,
        room: form.room,
      },
    ]);
    closeDialog();
  }

  const rooms: Room[] = ["Soles", "Lunita"];
  return (
    <section className="mx-auto w-full max-w-[880px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <header className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">
            GESTIÓN
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Niños
          </h1>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-[18px] py-[11px] text-sm font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
        >
          <Icon name="plus" className="size-[17px]" />
          Agregar niño
        </button>
      </header>
      <label className="mb-[22px] flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3">
        <svg
          aria-hidden="true"
          className="size-[18px] shrink-0 text-[#b0a290]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          aria-label="Buscar niño"
          placeholder="Buscar niño…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#b6a99b]"
        />
      </label>
      {rooms.map((room) => {
        const roomKids =
          room === "Soles"
            ? [...kids, ...addedKids.filter((kid) => kid.room === room)]
            : addedKids.filter((kid) => kid.room === room);
        if (!roomKids.length) return null;
        return (
          <section key={room} className="mb-6">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="text-xs font-extrabold tracking-[0.08em] text-ink">
                SALA {room.toUpperCase()}
              </span>
              <span className="text-[13px] text-[#a89a8b]">
                {roomKids.length} niños
              </span>
              <span className="h-px flex-1 bg-[#e7dac8]" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {roomKids.map((kid) => (
                <KidCard key={kid.id} kid={kid} />
              ))}
            </div>
          </section>
        );
      })}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f362e]/45 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <form
            onSubmit={saveKid}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-kid-title"
            className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/25"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
              <button
                type="button"
                onClick={closeDialog}
                className="text-[15px] font-bold text-muted"
              >
                Cancelar
              </button>
              <h2
                id="add-kid-title"
                className="font-display text-lg font-semibold text-ink"
              >
                Agregar niño
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Cerrar"
                className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#f0e6d8] text-muted"
              >
                <svg
                  aria-hidden="true"
                  className="size-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="space-y-[18px] p-5 sm:p-[26px]">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                  NOMBRE COMPLETO
                </span>
                <input
                  ref={nameRef}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Ej. Martina López"
                  className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
                />
                {errors.name && (
                  <p
                    id="name-error"
                    className="mt-1.5 text-sm font-bold text-[#c5413a]"
                  >
                    {errors.name}
                  </p>
                )}
              </label>
              <div className="grid gap-[18px] sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                    FECHA DE NACIMIENTO
                  </span>
                  <input
                    id="birthDate"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.birthDate)}
                    aria-describedby={
                      errors.birthDate ? "birth-date-error" : undefined
                    }
                    value={form.birthDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        birthDate: formatBirthDate(event.target.value),
                      })
                    }
                    placeholder="dd/mm/aaaa"
                    className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
                  />
                  {errors.birthDate && (
                    <p
                      id="birth-date-error"
                      className="mt-1.5 text-sm font-bold text-[#c5413a]"
                    >
                      {errors.birthDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                    SALA
                  </span>
                  <select
                    value={form.room}
                    onChange={(event) =>
                      setForm({ ...form, room: event.target.value as Room })
                    }
                    aria-invalid={Boolean(errors.room)}
                    aria-describedby={errors.room ? "room-error" : undefined}
                    className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] font-bold text-ink outline-none"
                  >
                    <option value="Soles">Soles</option>
                    <option value="Lunita">Lunita</option>
                  </select>
                  {errors.room && (
                    <p
                      id="room-error"
                      className="mt-1.5 text-sm font-bold text-[#c5413a]"
                    >
                      {errors.room}
                    </p>
                  )}
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                  ALERGIAS (ETIQUETAS)
                </span>
                <input
                  value={form.allergies}
                  onChange={(event) =>
                    setForm({ ...form, allergies: event.target.value })
                  }
                  placeholder="Ej. Maní, Lactosa"
                  className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                  NOTAS MÉDICAS
                </span>
                <textarea
                  value={form.medicalNotes}
                  onChange={(event) =>
                    setForm({ ...form, medicalNotes: event.target.value })
                  }
                  placeholder="Indicaciones, medicación, contactos…"
                  className="min-h-[90px] w-full resize-y rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] leading-relaxed outline-none placeholder:text-[#b6a99b]"
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export function MateoProfile() {
  const parents = [
    {
      initial: "L",
      avatar: "bg-[#c9b6e8] text-white",
      name: "Lucía Fernández",
      detail: "Mamá · activa",
      status: "ACTIVA",
      statusClass: "bg-[#cfebd8] text-[#3e9b6c]",
    },
    {
      initial: "D",
      avatar: "bg-[#a9c7e8] text-white",
      name: "Diego Fernández",
      detail: "Papá · invitación enviada",
      status: "PENDIENTE",
      statusClass: "bg-[#f7e7a6] text-[#9a7b1e]",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-[820px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <BackLink />
      <div className="flex flex-wrap items-start gap-[26px]">
        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col gap-[18px]">
          <div className="flex flex-wrap items-center gap-[18px]">
            <InitialAvatar
              initial="M"
              className="bg-[#a9d9e8] text-[#1f7a93]"
              large
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[28px] font-semibold text-ink">
                Mateo Fernández
              </h1>
              <p className="mt-1 text-[15px] text-muted">3 años · Sala Soles</p>
            </div>
            <Link
              href="/kids/mateo-fernandez/edit"
              className="rounded-xl border-[1.5px] border-line bg-surface px-4 py-2 text-sm font-bold text-[#6e6359]"
            >
              Editar
            </Link>
          </div>
          <div className="flex gap-3.5 rounded-2xl bg-[#fbdad6] p-4 sm:p-[18px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#f4a8a0] text-white">
              <svg
                aria-hidden="true"
                className="size-[22px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-[#c5413a]">
                Alergias y notas
              </h2>
              <p className="mt-0.5 text-[14.5px] leading-relaxed text-[#b25249]">
                Alergia al maní. Evitar frutos secos. Lleva inhalador en la
                mochila.
              </p>
            </div>
          </div>
          <dl className="overflow-hidden rounded-2xl border border-line bg-surface">
            {[
              ["Fecha de nacimiento", "12 mar 2022"],
              ["Sala", "Soles"],
              ["Ingreso", "feb 2025"],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`flex justify-between gap-4 px-[18px] py-[15px] ${index < 2 ? "border-b border-[#f0e6d8]" : ""}`}
              >
                <dt className="text-[14.5px] text-muted">{label}</dt>
                <dd className="text-right text-[14.5px] font-extrabold text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="flex w-full flex-col gap-3.5 lg:w-[300px]">
          <Link
            href="/kids/mateo-fernandez/day-summary"
            className="flex items-center justify-center gap-2 rounded-[14px] bg-ink px-3 py-[13px] text-[15px] font-extrabold text-white"
          >
            <Icon name="sun" className="size-[18px]" />
            Resumen del día
          </Link>
          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-[18px]">
            <h2 className="mb-3.5 text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">
              PADRES VINCULADOS
            </h2>
            <div className="flex flex-col gap-3.5">
              {parents.map((parent) => (
                <div key={parent.name} className="flex items-center gap-3">
                  <InitialAvatar
                    initial={parent.initial}
                    className={parent.avatar}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-extrabold text-ink">
                      {parent.name}
                    </p>
                    <p className="text-[12.5px] text-[#a89a8b]">
                      {parent.detail}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10.5px] font-extrabold ${parent.statusClass}`}
                  >
                    {parent.status}
                  </span>
                </div>
              ))}
              <Link
                href="/kids/mateo-fernandez/link-parent"
                className="flex items-center gap-3 pt-2"
              >
                <span className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#d8cbba] text-[#b0a290]">
                  <Icon name="plus" className="size-[18px]" />
                </span>
                <span className="text-[14.5px] font-extrabold text-[#c5503a]">
                  Vincular otro padre
                </span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function KidForm({ editing = false }: { editing?: boolean }) {
  const title = editing ? "Editar niño" : "Agregar niño";
  return (
    <section className="mx-auto w-full max-w-[520px] px-5 py-10">
      <div className="overflow-hidden rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/15">
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <Link
            href={editing ? "/kids/mateo-fernandez" : "/kids"}
            className="text-[15px] font-bold text-muted"
          >
            Cancelar
          </Link>
          <h1 className="font-display text-lg font-semibold text-ink">
            {title}
          </h1>
          <Link
            href={editing ? "/kids/mateo-fernandez" : "/kids"}
            className="text-[15px] font-extrabold text-[#d9583c]"
          >
            Guardar
          </Link>
        </header>
        <div className="space-y-[18px] p-5 sm:p-[26px]">
          <Field
            label="NOMBRE COMPLETO"
            placeholder="Ej. Martina López"
            defaultValue={editing ? "Mateo Fernández" : undefined}
          />
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field
              label="FECHA DE NACIMIENTO"
              placeholder="dd/mm/aaaa"
              defaultValue={editing ? "12/03/2022" : undefined}
            />
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
                SALA
              </span>
              <span className="flex items-center gap-2 rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] font-bold text-ink">
                Soles
                <svg
                  aria-hidden="true"
                  className="ml-auto size-4 text-[#b0a290]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </label>
          </div>
          <Field
            label="ALERGIAS (ETIQUETAS)"
            placeholder="Ej. Maní, Lactosa"
            defaultValue={editing ? "Maní" : undefined}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
              NOTAS MÉDICAS
            </span>
            <textarea
              aria-label="Notas médicas"
              placeholder="Indicaciones, medicación, contactos…"
              defaultValue={
                editing
                  ? "Evitar frutos secos. Lleva inhalador en la mochila."
                  : undefined
              }
              className="min-h-[90px] w-full resize-y rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] leading-relaxed outline-none placeholder:text-[#b6a99b]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  placeholder,
  defaultValue,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
        {label}
      </span>
      <input
        aria-label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
      />
    </label>
  );
}

export function ParentLink() {
  return (
    <section className="mx-auto w-full max-w-[480px] px-5 py-10">
      <div className="overflow-hidden rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/15">
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <div>
            <h1 className="font-display text-lg font-semibold text-ink">
              Vincular padre
            </h1>
            <p className="text-[13px] text-[#a89a8b]">a Mateo Fernández</p>
          </div>
          <Link
            href="/kids/mateo-fernandez"
            aria-label="Cerrar"
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#f0e6d8] text-muted"
          >
            <svg
              aria-hidden="true"
              className="size-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Link>
        </header>
        <div className="space-y-[18px] p-5 sm:p-[26px]">
          <div className="flex gap-3 rounded-[14px] bg-[#e3ecfb] p-4 text-[13.5px] leading-relaxed text-[#3f5694]">
            <svg
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[#4e72c8]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Le enviaremos un correo con un código para que active su cuenta.
            Solo verá el feed de Mateo.
          </div>
          <Field
            label="NOMBRE DEL PADRE/MADRE"
            placeholder="Ej. Diego Fernández"
          />
          <Field label="EMAIL" placeholder="correo@ejemplo.com" />
          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-[0.07em] text-muted">
              PARENTESCO
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border-[1.5px] border-[#9fb8ec] bg-[#ccd8f4] py-[11px] text-sm font-extrabold text-[#4e72c8]"
              >
                Mamá
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border-[1.5px] border-line bg-surface py-[11px] text-sm font-extrabold text-[#6e6359]"
              >
                Papá
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border-[1.5px] border-line bg-surface py-[11px] text-sm font-extrabold text-[#6e6359]"
              >
                Tutor/a
              </button>
            </div>
          </div>
          <div className="rounded-2xl border-[1.5px] border-dashed border-[#e6d08a] bg-[#fbf1d6] p-[18px] text-center">
            <p className="text-xs font-extrabold tracking-[0.07em] text-[#a88526]">
              CÓDIGO DE INVITACIÓN
            </p>
            <p className="mt-2 font-display text-[34px] font-semibold tracking-[7px] text-[#8a7234]">
              7K4P9
            </p>
            <p className="mt-1.5 text-[13px] text-[#a88526]">Vence en 7 días</p>
          </div>
          <Link
            href="/kids/mateo-fernandez"
            className="flex items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
          >
            <svg
              aria-hidden="true"
              className="size-[19px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
            Enviar invitación
          </Link>
        </div>
      </div>
    </section>
  );
}

export function DaySummary() {
  const metrics = [
    ["3", "comidas", "bg-[#f7e7a6] text-[#9a7b1e]"],
    ["1h 30", "de siesta", "bg-[#e7dcf6] text-[#7b5fc0]"],
    ["4", "momentos", "bg-[#c7e7f1] text-[#2e89a6]"],
  ];
  return (
    <section className="mx-auto w-full max-w-[700px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-ink py-[7px] pr-[15px] pl-2 text-sm font-bold text-white"
        >
          <span className="flex size-[26px] items-center justify-center rounded-full bg-[#a9d9e8] font-display text-[13px] font-semibold text-[#1f7a93]">
            M
          </span>
          Mateo
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border-[1.5px] border-line bg-surface py-[7px] pr-[15px] pl-2 text-sm font-bold text-[#6e6359]"
        >
          <span className="flex size-[26px] items-center justify-center rounded-full bg-[#f4b8cc] font-display text-[13px] font-semibold text-[#c44a7a]">
            S
          </span>
          Sofía
        </button>
      </div>
      <header className="mb-[22px] rounded-[22px] bg-linear-to-br from-[#fbe0d2] to-[#f9d2de] p-6 sm:p-[30px]">
        <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">
          RESUMEN DEL DÍA
        </p>
        <h1 className="font-display text-[32px] font-semibold text-ink">
          El día de Mateo
        </h1>
        <p className="mt-1.5 text-[15px] text-[#9a6a6a]">martes 17 de junio</p>
      </header>
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {metrics.map(([value, label, className]) => (
          <div
            key={label}
            className={`rounded-[18px] p-5 text-center ${className}`}
          >
            <p className="font-display text-[26px] font-semibold">{value}</p>
            <p className="text-[13px] font-semibold">{label}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 sm:p-[18px]">
        <span className="flex size-11 items-center justify-center rounded-full bg-[#f9d2de] text-[#c56486]">
          <svg
            aria-hidden="true"
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </span>
        <div>
          <p className="text-[13px] text-[#a89a8b]">Ánimo del día</p>
          <p className="font-display text-lg font-semibold text-ink">
            Contento y participativo
          </p>
        </div>
      </div>
      <h2 className="mb-3.5 text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">
        LO MÁS LINDO DE HOY
      </h2>
      <div className="flex flex-col gap-[18px]">
        <Link
          href="/publicaciones/mateo-logro"
          className="flex items-start gap-3.5"
        >
          <span className="mt-0.5 flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#cfebd8]">
            <span className="size-3 rounded-full bg-[#3e9b6c]" />
          </span>
          <span>
            <span className="block font-display text-base font-semibold text-[#3e9b6c]">
              ¡Usó el orinal solito!
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              14:20 · Un gran paso, estaba feliz de contarlo.
            </span>
          </span>
        </Link>
        <Link
          href="/publicaciones/mateo-actividad"
          className="flex items-start gap-3.5"
        >
          <span className="mt-0.5 flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#c7e7f1]">
            <span className="size-3 rounded-full bg-[#2e89a6]" />
          </span>
          <span>
            <span className="block font-display text-base font-semibold text-[#2e89a6]">
              Pintó con témperas
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              09:40 · Eligió el azul para todo.
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
