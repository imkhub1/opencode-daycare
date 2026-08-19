"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createParentInvitation,
  type ParentInvitationActionState,
  type ParentInvitationFormValues,
} from "@/app/kids/parent-invitations/actions";

const INITIAL_STATE: ParentInvitationActionState = { success: false };
const RELATIONSHIPS = ["Mamá", "Papá", "Tutor/a"] as const;

type ParentLinkDialogProps = {
  childId: string;
  childName: string;
  onClose: () => void;
  onSuccess: (token: string) => void;
};

function emptyForm(): ParentInvitationFormValues {
  return { name: "", email: "", relationship: "Mamá" };
}

export function ParentLinkDialog({
  childId,
  childName,
  onClose,
  onSuccess,
}: ParentLinkDialogProps) {
  const [state, formAction, pending] = useActionState(
    createParentInvitation,
    INITIAL_STATE,
  );
  const [form, setForm] = useState(emptyForm);
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

  useEffect(() => {
    if (state.success && state.token) onSuccess(state.token);
  }, [onSuccess, state.success, state.token]);

  const errors = state.errors ?? {};

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
        <input type="hidden" name="relationship" value={form.relationship} />
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <div>
            <h2 id="link-parent-title" className="font-display text-lg font-semibold text-ink">
              Vincular padre
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
        <div className="space-y-[18px] p-5 sm:p-[26px]">
          <div className="flex gap-3 rounded-[14px] bg-[#e3ecfb] p-4 text-[13.5px] leading-relaxed text-[#3f5694]">
            <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#4e72c8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {childName}.
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
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3.5 text-[15.5px] font-extrabold text-white shadow-lg shadow-[#ee8164]/25 disabled:cursor-wait disabled:opacity-60"
          >
            {pending
              ? state.invitationId
                ? "Reintentando…"
                : "Enviando…"
              : state.invitationId
                ? "Reintentar envío"
                : "Enviar invitación"}
          </button>
        </div>
      </form>
    </div>
  );
}
