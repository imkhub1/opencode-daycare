"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import {
  archiveChild,
  createChild,
  restoreChild,
  updateChild,
  type Child,
  type ChildFormState,
  type ChildFormValues,
  type ChildLifecycleState,
  type ChildStatus,
  type Room,
} from "@/app/kids/actions";
import {
  cancelParentInvitation,
  retryParentInvitation,
  type ParentInvitationSummary,
  type ParentLink,
} from "@/app/kids/parent-invitations/actions";
import { Icon } from "@/components/open-daycare";
import { ParentLinkDialog } from "@/components/parent-link-dialog";

const INITIAL_FORM_STATE: ChildFormState = { success: false };
const INITIAL_LIFECYCLE_STATE: ChildLifecycleState = { success: false, message: "" };
const avatarTones = [
  "bg-[#a9d9e8] text-[#1f7a93]",
  "bg-[#f4b8cc] text-[#c44a7a]",
  "bg-[#b9dec4] text-[#3e8b62]",
  "bg-[#f4dc8e] text-[#9a7b1e]",
  "bg-[#c9b6e8] text-[#7b5fc0]",
];

type FormErrors = Partial<Record<keyof ChildFormValues, string>>;
function InitialAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const initial = name.trim().charAt(0).toLocaleUpperCase("es") || "N";
  const tone = avatarTones[name.length % avatarTones.length];

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${large ? "size-[84px] text-[34px]" : "size-12 text-[19px]"} ${tone}`}
    >
      {initial}
    </span>
  );
}

function BackLink({ href = "/kids", children = "Volver a Niños" }) {
  return (
    <Link href={href} className="mb-5 flex items-center gap-1.5 text-sm font-bold text-muted">
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

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join("/");
}

function isoToDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function localToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(match[3]) &&
    date.getMonth() + 1 === Number(match[2]) &&
    date.getDate() === Number(match[1])
    ? iso
    : null;
}

function ageFromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }
  return `${age} ${age === 1 ? "año" : "años"}`;
}

function validateLocally(values: ChildFormValues): FormErrors {
  const errors: FormErrors = {};
  const birthDate = parseDisplayDate(values.birthDate);

  if (!values.fullName.trim()) errors.fullName = "Escribe el nombre completo.";
  if (!birthDate) errors.birthDate = "Usa una fecha válida en formato DD/MM/AAAA.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.enrolledAt)) {
    errors.enrolledAt = "Selecciona una fecha de inscripción válida.";
  }
  if (!values.roomId) errors.roomId = "Selecciona una sala válida.";

  if (birthDate && values.enrolledAt) {
    if (birthDate >= values.enrolledAt) {
      errors.birthDate = "El nacimiento debe ser anterior a la inscripción.";
    } else if (values.enrolledAt > localToday()) {
      errors.enrolledAt = "La inscripción no puede ser posterior a hoy.";
    }
  }

  return errors;
}

function emptyForm(rooms: Room[]): ChildFormValues {
  return {
    fullName: "",
    birthDate: "",
    enrolledAt: "",
    roomId: rooms[0]?.id ?? "",
    allergies: "",
    medicalNotes: "",
    photoConsent: true,
  };
}

function ChildFormFields({
  idPrefix,
  rooms,
  values,
  setValues,
  errors,
}: {
  idPrefix: string;
  rooms: Room[];
  values: ChildFormValues;
  setValues: Dispatch<SetStateAction<ChildFormValues>>;
  errors: FormErrors;
}) {
  function update<Key extends keyof ChildFormValues>(key: Key, value: ChildFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-[18px]">
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          NOMBRE COMPLETO
        </span>
        <input
          id={`${idPrefix}-full-name`}
          name="fullName"
          required
          autoComplete="off"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? `${idPrefix}-full-name-error` : undefined}
          value={values.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          placeholder="Ej. Martina López"
          className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
        />
        {errors.fullName && (
          <p id={`${idPrefix}-full-name-error`} className="mt-1.5 text-sm font-bold text-[#c5413a]">
            {errors.fullName}
          </p>
        )}
      </label>

      <div className="grid gap-[18px] sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
            FECHA DE NACIMIENTO
          </span>
          <input
            name="birthDate"
            required
            inputMode="numeric"
            aria-invalid={Boolean(errors.birthDate)}
            aria-describedby={errors.birthDate ? `${idPrefix}-birth-date-error` : undefined}
            value={values.birthDate}
            onChange={(event) => update("birthDate", formatBirthDate(event.target.value))}
            placeholder="dd/mm/aaaa"
            className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
          />
          {errors.birthDate && (
            <p id={`${idPrefix}-birth-date-error`} className="mt-1.5 text-sm font-bold text-[#c5413a]">
              {errors.birthDate}
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
            FECHA DE INSCRIPCIÓN
          </span>
          <input
            type="date"
            name="enrolledAt"
            required
            max={localToday()}
            aria-invalid={Boolean(errors.enrolledAt)}
            aria-describedby={errors.enrolledAt ? `${idPrefix}-enrolled-at-error` : undefined}
            value={values.enrolledAt}
            onChange={(event) => update("enrolledAt", event.target.value)}
            className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] text-ink outline-none"
          />
          {errors.enrolledAt && (
            <p id={`${idPrefix}-enrolled-at-error`} className="mt-1.5 text-sm font-bold text-[#c5413a]">
              {errors.enrolledAt}
            </p>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">SALA</span>
        <select
          name="roomId"
          required
          aria-invalid={Boolean(errors.roomId)}
          aria-describedby={errors.roomId ? `${idPrefix}-room-error` : undefined}
          value={values.roomId}
          onChange={(event) => update("roomId", event.target.value)}
          className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] font-bold text-ink outline-none"
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        {errors.roomId && (
          <p id={`${idPrefix}-room-error`} className="mt-1.5 text-sm font-bold text-[#c5413a]">
            {errors.roomId}
          </p>
        )}
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          ALERGIAS (ETIQUETAS)
        </span>
        <input
          name="allergies"
          value={values.allergies}
          onChange={(event) => update("allergies", event.target.value)}
          placeholder="Ej. Maní, Lactosa"
          className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          NOTAS MÉDICAS
        </span>
        <textarea
          name="medicalNotes"
          value={values.medicalNotes}
          onChange={(event) => update("medicalNotes", event.target.value)}
          placeholder="Indicaciones, medicación, contactos…"
          className="min-h-[90px] w-full resize-y rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] leading-relaxed outline-none placeholder:text-[#b6a99b]"
        />
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3.5">
        <input
          type="checkbox"
          name="photoConsent"
          value="true"
          checked={values.photoConsent}
          onChange={(event) => update("photoConsent", event.target.checked)}
          className="size-5 accent-[#e0654a]"
        />
        <span className="text-[15px] font-bold text-ink">Autoriza fotografías</span>
      </label>
    </div>
  );
}

function AddChildDialog({ rooms, onClose, onSuccess }: { rooms: Room[]; onClose: () => void; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(createChild, INITIAL_FORM_STATE);
  const [values, setValues] = useState(() => emptyForm(rooms));
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input[name='fullName']")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [onSuccess, state.success]);

  function validate(event: FormEvent<HTMLFormElement>) {
    const errors = validateLocally(values);
    setLocalErrors(errors);
    if (Object.keys(errors).length) event.preventDefault();
  }

  const errors = { ...state.errors, ...localErrors };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f362e]/45 p-4 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        ref={dialogRef}
        action={formAction}
        onSubmit={validate}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-child-title"
        className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/25"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <button type="button" onClick={onClose} disabled={pending} className="text-[15px] font-bold text-muted disabled:opacity-50">
            Cancelar
          </button>
          <h2 id="add-child-title" className="font-display text-lg font-semibold text-ink">
            Agregar niño
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#f0e6d8] text-muted disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>
        <div className="p-5 sm:p-[26px]">
          <ChildFormFields
            idPrefix="add-child"
            rooms={rooms}
            values={values}
            setValues={setValues}
            errors={errors}
          />
          {state.message && (
            <p aria-live="polite" className="mt-4 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-[18px] flex w-full items-center justify-center rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25 disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RestoreButton({ childId }: { childId: string }) {
  const router = useRouter();
  const action = restoreChild.bind(null, childId);
  const [state, formAction, pending] = useActionState(action, INITIAL_LIFECYCLE_STATE);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="shrink-0">
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#cfebd8] px-3 py-2 text-xs font-extrabold text-[#3e8b62] disabled:opacity-60"
      >
        {pending ? "Restaurando…" : "Restaurar"}
      </button>
      {state.message && !state.success && (
        <p aria-live="polite" className="mt-1 max-w-36 text-right text-xs font-bold text-[#c5413a]">
          {state.message}
        </p>
      )}
    </form>
  );
}

function ChildCard({ child, archived }: { child: Child; archived: boolean }) {
  return (
    <article className="flex min-w-0 items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 shadow-sm shadow-[#785a3c]/10">
      <Link href={`/kids/${child.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 rounded-lg focus-visible:outline-offset-4">
        <InitialAvatar name={child.fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-ink">
            {child.fullName}
          </span>
          <span className="mt-0.5 block text-[13px] text-[#a89a8b]">
            {ageFromIsoDate(child.birthDate)} · Sala {child.roomName}
          </span>
        </span>
        {child.allergyTags[0] && !archived && (
          <span className="hidden shrink-0 rounded-full bg-[#fbd8cc] px-2.5 py-1 text-[11px] font-extrabold text-[#d9684a] sm:block">
            {child.allergyTags[0].toLocaleUpperCase("es")}
          </span>
        )}
      </Link>
      {archived && <RestoreButton childId={child.id} />}
    </article>
  );
}

export function ChildrenDirectory({
  rooms,
  childRecords,
  view,
}: {
  rooms: Room[];
  childRecords: Child[];
  view: ChildStatus;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const filteredChildren = childRecords
    .filter((child) => child.fullName.toLocaleLowerCase("es").includes(normalizedSearch))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "es", { sensitivity: "base" }));

  function closeDialog() {
    setDialogOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function completeCreate() {
    setDialogOpen(false);
    router.refresh();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <section className="mx-auto w-full max-w-[880px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <header className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">GESTIÓN</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Niños</h1>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-[18px] py-[11px] text-sm font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
        >
          <Icon name="plus" className="size-[17px]" />
          Agregar niño
        </button>
      </header>

      <div className="mb-4 flex w-fit rounded-xl border border-line bg-surface p-1 text-sm font-bold">
        <Link href="/kids" className={`rounded-lg px-3 py-2 ${view === "active" ? "bg-coral-soft text-[#d9583c]" : "text-muted"}`}>
          Activos
        </Link>
        <Link href="/kids?view=archived" className={`rounded-lg px-3 py-2 ${view === "archived" ? "bg-coral-soft text-[#d9583c]" : "text-muted"}`}>
          Archivados
        </Link>
      </div>

      <label className="mb-[22px] flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3">
        <svg aria-hidden="true" className="size-[18px] shrink-0 text-[#b0a290]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          aria-label="Buscar niño"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar niño…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#b6a99b]"
        />
      </label>

      {rooms.map((room) => {
        const roomChildren = filteredChildren.filter((child) => child.roomId === room.id);
        return (
          <section key={room.id} className="mb-6">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="text-xs font-extrabold tracking-[0.08em] text-ink">
                SALA {room.name.toLocaleUpperCase("es")}
              </span>
              <span className="text-[13px] text-[#a89a8b]">
                {roomChildren.length} {roomChildren.length === 1 ? "niño" : "niños"}
              </span>
              <span className="h-px flex-1 bg-[#e7dac8]" />
            </div>
            {roomChildren.length ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {roomChildren.map((child) => (
                  <ChildCard key={child.id} child={child} archived={view === "archived"} />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#d8cbba] bg-surface/55 px-5 py-7 text-center text-sm font-semibold text-muted">
                {normalizedSearch
                  ? "No hay nombres que coincidan con la búsqueda."
                  : view === "archived"
                    ? "No hay niños archivados en esta sala."
                    : "Todavía no hay niños en esta sala."}
              </div>
            )}
          </section>
        );
      })}

      {dialogOpen && <AddChildDialog rooms={rooms} onClose={closeDialog} onSuccess={completeCreate} />}
    </section>
  );
}

function LifecycleButton({ child }: { child: Child }) {
  const router = useRouter();
  const archived = child.status === "archived";
  const action = (archived ? restoreChild : archiveChild).bind(null, child.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_LIFECYCLE_STATE);

  useEffect(() => {
    if (!state.success) return;
    if (state.status === "archived") router.push("/kids?view=archived");
    else router.refresh();
  }, [router, state.status, state.success]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!archived && !window.confirm(`¿Archivar a ${child.fullName}?`)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-[14px] px-4 py-3 text-sm font-extrabold disabled:opacity-60 ${archived ? "bg-[#cfebd8] text-[#3e8b62]" : "border border-[#efb4aa] bg-[#fff4f1] text-[#c5413a]"}`}
      >
        {pending ? "Guardando…" : archived ? "Restaurar niño" : "Archivar niño"}
      </button>
      {state.message && !state.success && (
        <p aria-live="polite" className="mt-2 text-sm font-bold text-[#c5413a]">
          {state.message}
        </p>
      )}
    </form>
  );
}

function relationshipLabel(relationship: ParentLink["relationship"] | ParentInvitationSummary["relationship"]) {
  return {
    mother: "Mamá",
    father: "Papá",
    guardian: "Tutor/a",
  }[relationship];
}

function RetryInvitationButton({
  invitationId,
  onSuccess,
}: {
  invitationId: string;
  onSuccess: (token: string) => void;
}) {
  const router = useRouter();
  const action = retryParentInvitation.bind(null, invitationId);
  const [state, formAction, pending] = useActionState(action, { success: false });

  useEffect(() => {
    if (state.success) {
      if (state.token) onSuccess(state.token);
      router.refresh();
    }
  }, [onSuccess, router, state.success, state.token]);

  return (
    <form action={formAction} className="mt-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#fff0eb] px-3 py-2 text-xs font-extrabold text-[#c5503a] disabled:opacity-60"
      >
        {pending ? "Reintentando…" : "Reintentar envío"}
      </button>
      {state.message && !state.success && (
        <p role="alert" className="mt-1 text-xs font-bold text-[#c5413a]">
          {state.message}
        </p>
      )}
    </form>
  );
}

function CancelInvitationButton({
  invitationId,
  childId,
  parentName,
}: {
  invitationId: string;
  childId: string;
  parentName: string;
}) {
  const router = useRouter();
  const action = cancelParentInvitation.bind(null, invitationId, childId);
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="mt-1"
      onSubmit={(event) => {
        if (!window.confirm(`¿Cancelar la invitación de ${parentName}?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-extrabold text-[#c5413a] disabled:opacity-60"
      >
        {pending ? "Cancelando…" : "Cancelar invitación"}
      </button>
      {state.message && !state.success && (
        <p role="alert" className="mt-1 text-xs font-bold text-[#c5413a]">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ChildProfile({
  child,
  linkedParents,
  invitations,
}: {
  child: Child;
  linkedParents: ParentLink[];
  invitations: ParentInvitationSummary[];
}) {
  const router = useRouter();
  const [isParentDialogOpen, setIsParentDialogOpen] = useState(false);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const parentLinkTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );
  const medicalSummary = [
    child.allergyTags.length ? `Alergias: ${child.allergyTags.join(", ")}.` : "Sin alergias registradas.",
    child.medicalNotes || "Sin notas médicas.",
  ].join(" ");

  function closeParentDialog() {
    setIsParentDialogOpen(false);
    requestAnimationFrame(() => parentLinkTriggerRef.current?.focus());
  }

  function handleInvitationSuccess(token: string) {
    setSuccessToken(token);
    closeParentDialog();
    router.refresh();
  }

  return (
    <section className="mx-auto w-full max-w-[820px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <BackLink href={child.status === "archived" ? "/kids?view=archived" : "/kids"} />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-[18px]">
          <div className="flex flex-wrap items-center gap-[18px]">
            <InitialAvatar name={child.fullName} large />
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-[28px] font-semibold text-ink">{child.fullName}</h1>
              <p className="mt-1 text-[15px] text-muted">
                {ageFromIsoDate(child.birthDate)} · Sala {child.roomName}
              </p>
            </div>
            <Link href={`/kids/${child.id}/edit`} className="rounded-xl border-[1.5px] border-line bg-surface px-4 py-2 text-sm font-bold text-[#6e6359]">
              Editar
            </Link>
          </div>

          <div className="flex gap-3.5 rounded-2xl bg-[#fbdad6] p-4 sm:p-[18px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#f4a8a0] text-white">!</span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-[#c5413a]">Alergias y notas</h2>
              <p className="mt-0.5 break-words text-[14.5px] leading-relaxed text-[#b25249]">{medicalSummary}</p>
            </div>
          </div>

          <dl className="overflow-hidden rounded-2xl border border-line bg-surface">
            {[
              ["Fecha de nacimiento", isoToDisplayDate(child.birthDate)],
              ["Sala", child.roomName],
              ["Ingreso", isoToDisplayDate(child.enrolledAt)],
              ["Autoriza fotografías", child.photoConsent ? "Sí" : "No"],
              ["Estado", child.status === "active" ? "Activo" : "Archivado"],
            ].map(([label, value], index, rows) => (
              <div key={label} className={`flex justify-between gap-4 px-[18px] py-[15px] ${index < rows.length - 1 ? "border-b border-[#f0e6d8]" : ""}`}>
                <dt className="text-[14.5px] text-muted">{label}</dt>
                <dd className="text-right text-[14.5px] font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="space-y-3">
          <Link href={`/kids/${child.id}/edit`} className="block rounded-[14px] bg-ink px-4 py-3 text-center text-sm font-extrabold text-white">
            Editar datos
          </Link>
          <LifecycleButton child={child} />
          {successToken && (
            <section role="status" className="rounded-2xl border-[1.5px] border-dashed border-[#e6d08a] bg-[#fbf1d6] p-4">
              <p className="text-xs font-extrabold tracking-[0.07em] text-[#a88526]">CÓDIGO ENVIADO</p>
              <p className="mt-1 font-display text-[28px] font-semibold tracking-[6px] text-[#8a7234]">{successToken}</p>
              <p className="mt-1 text-xs text-[#a88526]">Compártelo solo con la persona invitada.</p>
            </section>
          )}
          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-[18px]">
            <h2 className="mb-3.5 text-xs font-extrabold tracking-[0.08em] text-[#8a7c6d]">PADRES VINCULADOS</h2>
            <div className="flex flex-col gap-3.5">
              {linkedParents.length || pendingInvitations.length ? (
                <>
                  {linkedParents.map((parent) => (
                  <div key={parent.id} className="flex items-center gap-3">
                    <InitialAvatar name={parent.fullName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-extrabold text-ink">{parent.fullName}</p>
                      <p className="truncate text-[12.5px] text-[#a89a8b]">{parent.email} · {relationshipLabel(parent.relationship)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#cfebd8] px-2 py-1 text-[10.5px] font-extrabold text-[#3e8b62]">ACTIVA</span>
                  </div>
                  ))}
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-start gap-3 rounded-xl bg-[#fffaf2] p-2">
                      <InitialAvatar name={invitation.fullName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-extrabold text-ink">{invitation.fullName}</p>
                        <p className="truncate text-[12.5px] text-[#a89a8b]">{invitation.email} · {relationshipLabel(invitation.relationship)}</p>
                        <p className="text-[12px] text-[#a89a8b]">Vence {new Date(invitation.expiresAt).toLocaleDateString("es-AR")}</p>
                        <p className={`text-[12px] font-bold ${invitation.deliveryStatus === "failed" ? "text-[#c5413a]" : "text-[#3e8b62]"}`}>
                          {invitation.deliveryStatus === "failed" ? "Error de envío" : "Correo enviado"}
                        </p>
                        {invitation.deliveryStatus === "failed" && child.status === "active" && (
                          <RetryInvitationButton invitationId={invitation.id} onSuccess={setSuccessToken} />
                        )}
                        {child.status === "active" && (
                          <CancelInvitationButton
                            invitationId={invitation.id}
                            childId={child.id}
                            parentName={invitation.fullName}
                          />
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f7e7a6] px-2 py-1 text-[10.5px] font-extrabold text-[#9a7b1e]">PENDIENTE</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted">Todavía no hay padres vinculados.</p>
              )}
              {child.status === "active" && (
                <button
                  ref={parentLinkTriggerRef}
                  type="button"
                  onClick={() => setIsParentDialogOpen(true)}
                  className="flex items-center gap-3 pt-2 text-left"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#d8cbba] text-[#b0a290]">
                    <Icon name="plus" className="size-[18px]" />
                  </span>
                  <span className="text-[14.5px] font-extrabold text-[#c5503a]">
                    {linkedParents.length || pendingInvitations.length
                      ? "Vincular otro padre"
                      : "Vincular padre"}
                  </span>
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
      {isParentDialogOpen && (
        <ParentLinkDialog
          childId={child.id}
          childName={child.fullName}
          onClose={closeParentDialog}
          onSuccess={handleInvitationSuccess}
        />
      )}
    </section>
  );
}

export function ChildEditForm({ child, rooms }: { child: Child; rooms: Room[] }) {
  const router = useRouter();
  const action = updateChild.bind(null, child.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const [values, setValues] = useState<ChildFormValues>({
    fullName: child.fullName,
    birthDate: isoToDisplayDate(child.birthDate),
    enrolledAt: child.enrolledAt,
    roomId: child.roomId,
    allergies: child.allergyTags.join(", "),
    medicalNotes: child.medicalNotes ?? "",
    photoConsent: child.photoConsent,
  });

  useEffect(() => {
    if (state.success) router.push(`/kids/${child.id}`);
  }, [child.id, router, state.success]);

  function validate(event: FormEvent<HTMLFormElement>) {
    const errors = validateLocally(values);
    setLocalErrors(errors);
    if (Object.keys(errors).length) event.preventDefault();
  }

  return (
    <section className="mx-auto w-full max-w-[560px] px-5 py-8 pb-16 sm:py-10">
      <BackLink href={`/kids/${child.id}`}>Volver al perfil</BackLink>
      <form action={formAction} onSubmit={validate} noValidate className="overflow-hidden rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/15">
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <Link href={`/kids/${child.id}`} className="text-[15px] font-bold text-muted">Cancelar</Link>
          <h1 className="font-display text-lg font-semibold text-ink">Editar niño</h1>
          <button type="submit" disabled={pending} className="text-[15px] font-extrabold text-[#d9583c] disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </header>
        <div className="p-5 sm:p-[26px]">
          <ChildFormFields
            idPrefix="edit-child"
            rooms={rooms}
            values={values}
            setValues={setValues}
            errors={{ ...state.errors, ...localErrors }}
          />
          {state.message && (
            <p aria-live="polite" className="mt-4 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

export function KidsReadError({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-[620px] items-center px-5 py-10">
      <div className="w-full rounded-[22px] border border-line bg-surface p-7 text-center shadow-sm shadow-[#785a3c]/10">
        <p className="text-xs font-extrabold tracking-[0.08em] text-[#d9583c]">NO PUDIMOS CARGAR</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">No se pudieron cargar los niños</h1>
        <p className="mt-2 text-sm text-muted">Revisa tu conexión e inténtalo nuevamente.</p>
        <button onClick={onRetry ?? router.refresh} className="mt-5 rounded-[14px] bg-coral px-5 py-3 text-sm font-extrabold text-white">
          Reintentar
        </button>
      </div>
    </section>
  );
}
