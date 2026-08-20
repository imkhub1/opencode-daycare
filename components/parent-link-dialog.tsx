"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createParentInvitation,
  editParentInvitation,
  type ParentInvitationActionState,
  type ParentInvitationFormValues,
} from "@/app/kids/parent-invitations/actions";

const INITIAL_STATE: ParentInvitationActionState = { success: false };
const RELATIONSHIPS = ["Mamá", "Papá", "Tutor/a"] as const;
const RELATIONSHIP_VALUES = {
  Mamá: "mother",
  Papá: "father",
  "Tutor/a": "guardian",
} as const;

type ParentLinkDialogProps = {
  childId: string;
  childName: string;
  onClose: () => void;
  initialValues?: ParentInvitationFormValues;
  invitationId?: string;
  edit?: boolean;
};

function emptyForm(): ParentInvitationFormValues {
  return { name: "", email: "", relationship: "Mamá" };
}

export function ParentLinkDialog({
  childId,
  childName,
  onClose,
  initialValues,
  invitationId,
  edit = false,
}: ParentLinkDialogProps) {
  const action = edit
    ? editParentInvitation.bind(null, invitationId ?? "", childId)
    : createParentInvitation;
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE,
  );
  const [form, setForm] = useState(() => initialValues ?? emptyForm());
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input[name='name']")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])",
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

  const errors = state.errors ?? {};
  const success = state.success && Boolean(state.token);

  useEffect(() => {
    if (edit && state.success) onClose();
  }, [edit, onClose, state.success]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f362e]/45 p-4 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        ref={dialogRef}
        action={formAction}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-parent-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-[24px] border border-line bg-[#fbf4ec] shadow-xl shadow-[#3f362e]/25 sm:max-h-[calc(100dvh-3rem)]"
      >
        <input type="hidden" name="childId" value={childId} />
        <input type="hidden" name="invitationId" value={state.invitationId ?? ""} />
        <input
          type="hidden"
          name="relationship"
          value={RELATIONSHIP_VALUES[form.relationship]}
        />
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <div>
            <h2 id="link-parent-title" className="font-display text-lg font-semibold text-ink">
              {edit ? "Editar invitación" : "Vincular padre"}
            </h2>
            <p className="text-[13px] text-[#a89a8b]">a {childName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#f0e6d8] text-muted disabled:opacity-50"
          >
            <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        {pending ? (
          <div
            aria-live="polite"
            className="flex min-h-[300px] flex-col items-center justify-center gap-5 px-5 py-14 text-center sm:px-[26px]"
          >
            <svg
              aria-hidden="true"
              className="size-11 animate-spin text-[#c5503a]"
              viewBox="0 0 44 44"
              fill="none"
            >
              <circle cx="22" cy="22" r="18" stroke="currentColor" strokeOpacity=".2" strokeWidth="5" />
              <path d="M40 22a18 18 0 0 0-18-18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <p className="font-display text-xl font-semibold text-ink">Enviando invitación…</p>
          </div>
        ) : success ? (
          <div
            role="status"
            className="flex flex-col items-center px-5 py-9 text-center sm:px-[38px] sm:py-10"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-[#dcfce7] text-[#3e9b5b]">
              <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-ink">¡Invitación enviada!</h3>
            <p className="mt-2 max-w-[360px] text-[14.5px] leading-relaxed text-muted">
              Se envió un correo a <strong className="font-extrabold text-ink">{form.email.trim().toLowerCase()}</strong> con el código de activación.
            </p>
            <div className="mt-6 w-full rounded-2xl border-[1.5px] border-dashed border-[#e6d08a] bg-[#fbf1d6] px-4 py-5">
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#a88526]">CÓDIGO DE INVITACIÓN</p>
              <p className="mt-2 font-display text-[34px] font-semibold tracking-[7px] text-[#8a7234]">{state.token}</p>
              <p className="mt-1 text-[13px] text-[#a88526]">Vence en 7 días</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 flex w-full items-center justify-center rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-[18px] p-5 sm:p-[26px]">
            <div className="flex gap-3 rounded-[14px] bg-[#e3ecfb] p-4 text-[13.5px] leading-relaxed text-[#3f5694]">
              <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#4e72c8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              {edit
                ? "Actualiza los datos del padre. Deberás reenviar la invitación para que reciba la información nueva."
                : `Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de ${childName}.`}
            </div>

            <label className="block" htmlFor="link-parent-name">
              <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">NOMBRE DEL PADRE/MADRE</span>
              <input
                id="link-parent-name"
                name="name"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Diego Fernández"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "link-parent-name-error" : undefined}
                className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
              />
              {errors.name && <p id="link-parent-name-error" className="mt-1.5 text-sm font-bold text-[#c5413a]">{errors.name}</p>}
            </label>

            <label className="block" htmlFor="link-parent-email">
              <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">EMAIL</span>
              <input
                id="link-parent-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="correo@ejemplo.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "link-parent-email-error" : undefined}
                className="w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] outline-none placeholder:text-[#b6a99b]"
              />
              {errors.email && <p id="link-parent-email-error" className="mt-1.5 text-sm font-bold text-[#c5413a]">{errors.email}</p>}
            </label>

            <fieldset>
              <legend className="mb-2.5 text-xs font-extrabold tracking-[0.07em] text-muted">PARENTESCO</legend>
              <div className="flex gap-2">
                {RELATIONSHIPS.map((relationship) => {
                  const selected = form.relationship === relationship;
                  return (
                    <button
                      key={relationship}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setForm((current) => ({ ...current, relationship }))}
                      className={`min-w-0 flex-1 rounded-full border-[1.5px] px-1 py-[11px] text-sm font-extrabold ${selected ? "border-[#9fb8ec] bg-[#ccd8f4] text-[#4e72c8]" : "border-line bg-surface text-[#6e6359]"}`}
                    >
                      {relationship}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {state.message && (
              <p role="alert" className="rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">
                {state.message}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
            >
              {edit ? "Guardar cambios" : state.invitationId ? "Reintentar envío" : "Enviar invitación"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
