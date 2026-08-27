"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type SetStateAction,
} from "react";

import {
  archiveChild,
  createChild,
  deleteChild,
  moveChildToRoom,
  restoreChild,
  updateChild,
  type Child,
  type ChildDeletionState,
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
import { useLocale } from "@/components/shared/LocaleProvider";
import { formatAge, formatDate, interpolate, type Dictionary, type Locale } from "@/utils/i18n/dictionary";

const INITIAL_FORM_STATE: ChildFormState = { success: false };
const INITIAL_LIFECYCLE_STATE: ChildLifecycleState = { success: false, message: "" };
const INITIAL_DELETION_STATE: ChildDeletionState = { success: false };
const avatarTones = [
  "bg-avatar-blue text-avatar-blue-ink",
  "bg-avatar-pink text-avatar-pink-ink",
  "bg-avatar-green text-avatar-green-ink",
  "bg-avatar-yellow text-avatar-yellow-ink",
  "bg-avatar-purple text-avatar-purple-ink",
];

type FormErrors = Partial<Record<keyof ChildFormValues, string>>;
type MoveError = { childId: string; message: string } | null;
function InitialAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const { locale } = useLocale();
  const initial = name.trim().charAt(0).toLocaleUpperCase(locale) || "N";
  const tone = avatarTones[name.length % avatarTones.length];

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${large ? "size-[84px] text-[34px]" : "size-12 text-[19px]"} ${tone}`}
    >
      {initial}
    </span>
  );
}

function BackLink({ href = "/staff/kids", children }: { href?: string; children?: React.ReactNode }) {
  const { dictionary } = useLocale();
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
      {children ?? dictionary.common.backToChildren}
    </Link>
  );
}

function isoToDisplayDate(value: string, locale: Locale) {
  return formatDate(value, locale, { dateStyle: "short" });
}

function localToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string) {
  const isoDate = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || Number(match[1]) < 1) return false;

  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === isoDate;
}

function ageFromIsoDate(value: string, locale: Locale) {
  return formatAge(value, locale);
}

function validateLocally(values: ChildFormValues, dictionary: Dictionary): FormErrors {
  const errors: FormErrors = {};
  const birthDate = isValidIsoDate(values.birthDate) ? values.birthDate : null;

  if (!values.fullName.trim()) errors.fullName = dictionary.kids.validation.fullName;
  if (!birthDate) errors.birthDate = dictionary.kids.validation.birthDate;
  if (!isValidIsoDate(values.enrolledAt)) {
    errors.enrolledAt = dictionary.kids.validation.enrollmentDate;
  } else if (values.enrolledAt > localToday()) {
    errors.enrolledAt = dictionary.kids.validation.enrollmentAfterToday;
  }
  if (!values.roomId) errors.roomId = dictionary.kids.validation.room;

  if (birthDate && isValidIsoDate(values.enrolledAt) && birthDate >= values.enrolledAt) {
    errors.birthDate = dictionary.kids.validation.birthBeforeEnrollment;
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

function childFormValues(child: Child): ChildFormValues {
  return {
    fullName: child.fullName.trim(),
    birthDate: child.birthDate.slice(0, 10),
    enrolledAt: child.enrolledAt.slice(0, 10),
    roomId: child.roomId,
    allergies: child.allergyTags.join(", "),
    medicalNotes: child.medicalNotes ?? "",
    photoConsent: child.photoConsent,
  };
}

function normalizeAllergyValues(value: string) {
  return [...new Set(value.split(",").map((allergy) => allergy.trim().toLowerCase()).filter(Boolean))].join(",");
}

function normalizeChildFormValues(values: ChildFormValues): ChildFormValues {
  return {
    fullName: values.fullName.trim(),
    birthDate: values.birthDate.trim(),
    enrolledAt: values.enrolledAt.trim(),
    roomId: values.roomId.trim(),
    allergies: normalizeAllergyValues(values.allergies),
    medicalNotes: values.medicalNotes.trim(),
    photoConsent: values.photoConsent,
  };
}

function areChildFormValuesEqual(left: ChildFormValues, right: ChildFormValues) {
  const normalizedLeft = normalizeChildFormValues(left);
  const normalizedRight = normalizeChildFormValues(right);

  return normalizedLeft.fullName === normalizedRight.fullName &&
    normalizedLeft.birthDate === normalizedRight.birthDate &&
    normalizedLeft.enrolledAt === normalizedRight.enrolledAt &&
    normalizedLeft.roomId === normalizedRight.roomId &&
    normalizedLeft.allergies === normalizedRight.allergies &&
    normalizedLeft.medicalNotes === normalizedRight.medicalNotes &&
    normalizedLeft.photoConsent === normalizedRight.photoConsent;
}

function ChildFormFields({
  idPrefix,
  rooms,
  values,
  setValues,
  errors,
  disabled = false,
}: {
  idPrefix: string;
  rooms: Room[];
  values: ChildFormValues;
  setValues: Dispatch<SetStateAction<ChildFormValues>>;
  errors: FormErrors;
  disabled?: boolean;
}) {
  const { dictionary } = useLocale();

  function update<Key extends keyof ChildFormValues>(key: Key, value: ChildFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-[18px]">
      <label className="block" htmlFor={`${idPrefix}-full-name`}>
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          {dictionary.kids.fullName}
        </span>
        <input
          id={`${idPrefix}-full-name`}
          name="fullName"
          required
          disabled={disabled}
          autoComplete="off"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? `${idPrefix}-full-name-error` : undefined}
          value={values.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          placeholder={dictionary.kids.fullNamePlaceholder}
          className="w-full rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] outline-none placeholder:text-placeholder"
        />
        {errors.fullName && (
            <p id={`${idPrefix}-full-name-error`} className="mt-1.5 text-sm font-bold text-danger">
            {errors.fullName}
          </p>
        )}
      </label>

      <div className="grid gap-[18px] sm:grid-cols-2">
        <label className="block" htmlFor={`${idPrefix}-birth-date`}>
          <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
            {dictionary.kids.birthDate}
          </span>
          <input
            id={`${idPrefix}-birth-date`}
            type="date"
            name="birthDate"
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.birthDate)}
            aria-describedby={errors.birthDate ? `${idPrefix}-birth-date-error` : undefined}
            value={values.birthDate}
            onChange={(event) => update("birthDate", event.target.value)}
            className="w-full rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] text-ink outline-none"
          />
          {errors.birthDate && (
            <p id={`${idPrefix}-birth-date-error`} className="mt-1.5 text-sm font-bold text-danger">
              {errors.birthDate}
            </p>
          )}
        </label>

        <label className="block" htmlFor={`${idPrefix}-enrolled-at`}>
          <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
            {dictionary.kids.enrollmentDate}
          </span>
          <input
            id={`${idPrefix}-enrolled-at`}
            type="date"
            name="enrolledAt"
            required
            disabled={disabled}
            max={localToday()}
            aria-invalid={Boolean(errors.enrolledAt)}
            aria-describedby={errors.enrolledAt ? `${idPrefix}-enrolled-at-error` : undefined}
            value={values.enrolledAt}
            onChange={(event) => update("enrolledAt", event.target.value)}
            className="w-full rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] text-ink outline-none"
          />
          {errors.enrolledAt && (
            <p id={`${idPrefix}-enrolled-at-error`} className="mt-1.5 text-sm font-bold text-danger">
              {errors.enrolledAt}
            </p>
          )}
        </label>
      </div>

      <label className="block" htmlFor={`${idPrefix}-room-id`}>
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">{dictionary.kids.room}</span>
        <div className="relative">
          <select
            id={`${idPrefix}-room-id`}
            name="roomId"
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.roomId)}
            aria-describedby={errors.roomId ? `${idPrefix}-room-error` : undefined}
            value={values.roomId}
            onChange={(event) => update("roomId", event.target.value)}
            className="w-full appearance-none rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] pr-12 text-[15px] font-bold text-ink outline-none"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
        </div>
        {errors.roomId && (
          <p id={`${idPrefix}-room-error`} className="mt-1.5 text-sm font-bold text-danger">
            {errors.roomId}
          </p>
        )}
      </label>

      <label className="block" htmlFor={`${idPrefix}-allergies`}>
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          {dictionary.kids.allergies}
        </span>
        <input
          id={`${idPrefix}-allergies`}
          name="allergies"
          disabled={disabled}
          value={values.allergies}
          onChange={(event) => update("allergies", event.target.value)}
          placeholder={dictionary.kids.allergiesPlaceholder}
          className="w-full rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] outline-none placeholder:text-placeholder"
        />
      </label>

      <label className="block" htmlFor={`${idPrefix}-medical-notes`}>
        <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
          {dictionary.kids.medicalNotes}
        </span>
        <textarea
          id={`${idPrefix}-medical-notes`}
          name="medicalNotes"
          disabled={disabled}
          value={values.medicalNotes}
          onChange={(event) => update("medicalNotes", event.target.value)}
          placeholder={dictionary.kids.medicalNotesPlaceholder}
          className="min-h-[90px] w-full resize-y rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] leading-relaxed outline-none placeholder:text-placeholder"
        />
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-surface-raised px-4 py-3.5" htmlFor={`${idPrefix}-photo-consent`}>
        <input
          id={`${idPrefix}-photo-consent`}
          type="checkbox"
          name="photoConsent"
          value="true"
          disabled={disabled}
          checked={values.photoConsent}
          onChange={(event) => update("photoConsent", event.target.checked)}
          className="size-5 accent-coral"
        />
        <span className="text-[15px] font-bold text-ink">{dictionary.kids.photoConsent}</span>
      </label>
    </div>
  );
}

function AddChildDialog({ rooms, onClose, onSuccess }: { rooms: Room[]; onClose: () => void; onSuccess: () => void }) {
  const { dictionary } = useLocale();
  const [state, formAction, pending] = useActionState(createChild, INITIAL_FORM_STATE);
  const [values, setValues] = useState(() => emptyForm(rooms));
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input[name='fullName']")?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }
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
    const errors = validateLocally(values, dictionary);
    setLocalErrors(errors);
    if (Object.keys(errors).length) event.preventDefault();
  }

  const errors = { ...state.errors, ...localErrors };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/45 p-4 sm:p-5"
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
        className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-line bg-canvas shadow-theme-lg"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <h2 id="add-child-title" className="font-display text-lg font-semibold text-ink">
            {dictionary.kids.addChild}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={dictionary.common.close}
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-surface-muted text-muted disabled:opacity-50"
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
            <p aria-live="polite" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-[18px] flex w-full items-center justify-center rounded-[14px] bg-coral-gradient px-3 py-3.5 text-[15.5px] font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? dictionary.common.saving : dictionary.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChildEditDialog({
  child,
  rooms,
  onClose,
}: {
  child: Child;
  rooms: Room[];
  onClose: () => void;
}) {
  const { dictionary } = useLocale();
  const router = useRouter();
  const updateAction = updateChild.bind(null, child.id);
  const [state, formAction, pending] = useActionState(updateAction, INITIAL_FORM_STATE);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const [initialValues] = useState(() => childFormValues(child));
  const [values, setValues] = useState(initialValues);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const mutationPending = pending || lifecyclePending || deletionPending;
  const closeAllowed = !mutationPending;
  const isDirty = !areChildFormValuesEqual(values, initialValues);
  const submitDisabled = !isDirty || mutationPending;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input[name='fullName']")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeAllowed) {
        event.preventDefault();
        onClose();
        return;
      }
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
  }, [closeAllowed, onClose]);

  useEffect(() => {
    if (state.success) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.success]);

  function validate(event: FormEvent<HTMLFormElement>) {
    const errors = validateLocally(values, dictionary);
    setLocalErrors(errors);
    if (Object.keys(errors).length) event.preventDefault();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-overlay/45 p-4 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeAllowed) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-child-title"
        aria-describedby="edit-child-description"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[520px] min-w-0 overflow-y-auto overflow-x-hidden rounded-[24px] border border-line bg-canvas shadow-theme-lg sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-[26px]">
          <div>
            <h2 id="edit-child-title" className="font-display text-lg font-semibold text-ink">{dictionary.kids.editChild}</h2>
            <p id="edit-child-description" className="sr-only">
              {interpolate(dictionary.kids.editDescription, { name: child.fullName })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!closeAllowed}
            aria-label={dictionary.common.close}
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-surface-muted text-muted disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>
        <form action={formAction} onSubmit={validate} noValidate className="p-5 sm:p-[26px]">
          <ChildFormFields
            idPrefix="edit-child"
            rooms={rooms}
            values={values}
            setValues={setValues}
            errors={{ ...state.errors, ...localErrors }}
            disabled={!closeAllowed}
          />
          {state.message && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
            className="mt-[18px] flex w-full items-center justify-center rounded-[14px] bg-coral-gradient px-3 py-3.5 text-[15.5px] font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? dictionary.common.saving : dictionary.kids.saveChanges}
          </button>
        </form>
        <div className="border-t border-line p-5 sm:p-[26px] sm:pt-5">
          <p className="mb-3 text-xs font-extrabold tracking-[0.08em] text-subtle-strong">{dictionary.kids.childManagement}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <LifecycleButton
              child={child}
              disabled={mutationPending}
              onPendingChange={setLifecyclePending}
            />
            <DeleteChildButton
              child={child}
              disabled={mutationPending}
              onPendingChange={setDeletionPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteChildButton({
  child,
  disabled = false,
  onPendingChange,
}: {
  child: Child;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const { dictionary } = useLocale();
  const action = deleteChild.bind(null, child.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_DELETION_STATE);
  const [confirmationName, setConfirmationName] = useState("");
  const matchesName = confirmationName === child.fullName;
  const confirmationHintId = `delete-child-confirmation-hint-${child.id}`;
  const confirmationErrorId = `delete-child-error-${child.id}`;

  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

  return (
    <form action={formAction} className="min-w-0 flex-1 space-y-2">
      <input
        type="text"
        name="confirmationName"
        disabled={disabled || pending}
        required
        value={confirmationName}
        onChange={(event) => setConfirmationName(event.target.value)}
        placeholder={child.fullName}
        aria-label={interpolate(dictionary.kids.deleteConfirmationLabel, { name: child.fullName })}
        aria-invalid={Boolean(state.message)}
        aria-describedby={state.message ? `${confirmationHintId} ${confirmationErrorId}` : confirmationHintId}
        className="w-full min-w-0 rounded-[14px] border-[1.5px] border-danger-border bg-surface-warm px-3 py-3 text-sm outline-none placeholder:text-placeholder"
      />
      <p id={confirmationHintId} className="text-xs leading-relaxed text-muted">
        {interpolate(dictionary.kids.deleteConfirmationHint, { name: child.fullName })}
      </p>
      <button
        type="submit"
        disabled={pending || disabled || !matchesName}
        aria-disabled={pending || disabled || !matchesName}
        className="w-full rounded-[14px] border border-danger-border bg-coral-faint px-4 py-3 text-sm font-extrabold text-danger disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? dictionary.common.deleting : dictionary.kids.permanentlyDelete}
      </button>
      {state.message && !state.success && (
        <p id={confirmationErrorId} role="alert" className="text-sm font-bold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

function ChildCard({
  child,
  archived,
  onDragStart,
  onDragEnd,
  movePending,
  moveError,
}: {
  child: Child;
  archived: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, childId: string) => void;
  onDragEnd: () => void;
  movePending: boolean;
  moveError: string | null;
}) {
  const { locale, dictionary } = useLocale();

  return (
    <article
      draggable={!movePending}
      onDragStart={(event) => onDragStart(event, child.id)}
      onDragEnd={onDragEnd}
      aria-busy={movePending}
      className="motion-child-card flex min-w-0 cursor-grab flex-wrap items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 shadow-theme-sm active:cursor-grabbing"
    >
      <Link href={`/staff/kids/${child.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 rounded-lg focus-visible:outline-offset-4">
        <InitialAvatar name={child.fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-ink">
            {child.fullName}
          </span>
          <span className="mt-0.5 block text-[13px] text-subtle">
            {ageFromIsoDate(child.birthDate, locale)} · {String(dictionary.kids.room)} {child.roomName}
          </span>
        </span>
        {child.allergyTags[0] && !archived && (
          <span className="hidden shrink-0 rounded-full bg-tag-photo px-2.5 py-1 text-[11px] font-extrabold text-tag-photo-ink sm:block">
            {child.allergyTags[0].toLocaleUpperCase(locale)}
          </span>
        )}
      </Link>
      {movePending && (
        <span className="shrink-0 text-[11px] font-bold text-muted" aria-live="polite">
          {dictionary.kids.movingChild}
        </span>
      )}
      {moveError && (
        <p className="basis-full text-xs font-bold text-danger" role="alert">
          {moveError}
        </p>
      )}
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
  const { locale, dictionary } = useLocale();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedChildId, setDraggedChildId] = useState<string | null>(null);
  const [dropTargetRoomId, setDropTargetRoomId] = useState<string | null>(null);
  const [movingChildId, setMovingChildId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<MoveError>(null);
  const [isMovePending, startMoveTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase(locale);
  const filteredChildren = childRecords
    .filter((child) => child.fullName.toLocaleLowerCase(locale).includes(normalizedSearch))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, locale, { sensitivity: "base" }));

  function requestMove(childId: string, roomId: string) {
    const child = childRecords.find((record) => record.id === childId);
    if (!child || child.roomId === roomId || isMovePending) return;

    setMoveError(null);
    setMovingChildId(childId);
    startMoveTransition(async () => {
      const result = await moveChildToRoom(childId, roomId);
      if (result.success) {
        router.refresh();
      } else {
        setMoveError({ childId, message: result.message });
      }
      setMovingChildId(null);
    });
  }

  function handleDragStart(event: DragEvent<HTMLElement>, childId: string) {
    if (isMovePending) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", childId);
    setDraggedChildId(childId);
    setMoveError(null);
  }

  function handleDragEnd() {
    setDraggedChildId(null);
    setDropTargetRoomId(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, roomId: string) {
    const childId = draggedChildId || event.dataTransfer.getData("text/plain");
    const child = childRecords.find((record) => record.id === childId);
    if (!child || child.roomId === roomId || isMovePending) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetRoomId(roomId);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setDropTargetRoomId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, roomId: string) {
    event.preventDefault();
    const childId = event.dataTransfer.getData("text/plain") || draggedChildId;
    setDraggedChildId(null);
    setDropTargetRoomId(null);

    if (childId) requestMove(childId, roomId);
  }

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
          <p className="mb-1 text-xs font-extrabold tracking-[0.08em] text-coral-deep">{dictionary.kids.management}</p>
          <h1 className="font-display text-3xl font-semibold text-ink">{dictionary.kids.title}</h1>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-[14px] bg-coral-gradient px-[18px] py-[11px] text-sm font-extrabold text-theme-white-strong shadow-theme-sm"
        >
          <Icon name="plus" className="size-[17px]" />
          {dictionary.kids.addChild}
        </button>
      </header>

      <div className="motion-tabs mb-4 flex w-fit rounded-xl border border-line bg-surface p-1 text-sm font-bold">
        <Link
          href="/staff/kids"
          aria-current={view === "active" ? "page" : undefined}
          className={`motion-tab rounded-lg px-3 py-2 ${view === "active" ? "bg-coral-soft text-coral-deep" : "text-muted"}`}
        >
          {dictionary.kids.activeChildren}
        </Link>
        <Link
          href="/staff/kids?view=archived"
          aria-current={view === "archived" ? "page" : undefined}
          className={`motion-tab rounded-lg px-3 py-2 ${view === "archived" ? "bg-coral-soft text-coral-deep" : "text-muted"}`}
        >
          {dictionary.kids.archivedChildren}
        </Link>
      </div>

      <p className="sr-only">{dictionary.kids.moveChildInstructions}</p>

      <label className="mb-[22px] flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3">
        <svg aria-hidden="true" className="size-[18px] shrink-0 text-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          aria-label={dictionary.kids.searchChild}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={dictionary.kids.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-placeholder"
        />
      </label>

      {rooms.map((room) => {
        const roomChildren = filteredChildren.filter((child) => child.roomId === room.id);
        return (
          <section
            key={room.id}
            onDragOver={(event) => handleDragOver(event, room.id)}
            onDragLeave={handleDragLeave}
            onDrop={(event) => handleDrop(event, room.id)}
            className={`mb-6 rounded-[20px] transition-colors ${dropTargetRoomId === room.id ? "bg-coral-faint p-2 ring-2 ring-coral ring-offset-2 ring-offset-canvas" : ""}`}
          >
            <div className="mb-3.5 flex items-center gap-3">
              <span className="text-xs font-extrabold tracking-[0.08em] text-ink">
                {dictionary.kids.room} {room.name.toLocaleUpperCase(locale)}
              </span>
              <span className="text-[13px] text-subtle">
                {roomChildren.length} {roomChildren.length === 1 ? dictionary.kids.child : dictionary.kids.children}
              </span>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            {roomChildren.length ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {roomChildren.map((child) => (
                  <ChildCard
                    key={child.id}
                    child={child}
                    archived={view === "archived"}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    movePending={isMovePending && movingChildId === child.id}
                    moveError={moveError?.childId === child.id ? moveError.message : null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-line-strong bg-surface/55 px-5 py-7 text-center text-sm font-semibold text-muted">
                {normalizedSearch
                  ? dictionary.kids.noSearchResults
                  : view === "archived"
                    ? dictionary.kids.noArchivedChildren
                    : dictionary.kids.noChildren}
              </div>
            )}
          </section>
        );
      })}

      {dialogOpen && <AddChildDialog rooms={rooms} onClose={closeDialog} onSuccess={completeCreate} />}
    </section>
  );
}

function LifecycleButton({
  child,
  disabled = false,
  onPendingChange,
}: {
  child: Child;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const { dictionary } = useLocale();
  const router = useRouter();
  const archived = child.status === "archived";
  const action = (archived ? restoreChild : archiveChild).bind(null, child.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_LIFECYCLE_STATE);

  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

  useEffect(() => {
    if (!state.success) return;
    if (state.status === "archived") router.push("/staff/kids?view=archived");
    else router.refresh();
  }, [router, state.status, state.success]);

  return (
    <form
      action={formAction}
      className="min-w-0 flex-1"
      onSubmit={(event) => {
        if (!archived && !window.confirm(interpolate(dictionary.kids.archiveConfirmation, { name: child.fullName }))) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending || disabled}
        className={`w-full rounded-[14px] px-4 py-3 text-sm font-extrabold disabled:opacity-60 ${archived ? "bg-success-soft text-success" : "border border-danger-border bg-coral-faint text-danger"}`}
      >
        {pending ? dictionary.common.saving : archived ? dictionary.kids.restoreChild : dictionary.kids.archiveChild}
      </button>
      {state.message && !state.success && (
        <p aria-live="polite" className="mt-2 text-sm font-bold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

function relationshipLabel(
  relationship: ParentLink["relationship"] | ParentInvitationSummary["relationship"],
  dictionary: Dictionary,
) {
  return dictionary.invitations[relationship];
}

function RetryInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const action = retryParentInvitation.bind(null, invitationId);
  const [state, formAction, pending] = useActionState(action, { success: false });

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="inline-flex flex-col items-start">
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-coral-faint px-3 py-2 text-xs font-extrabold text-coral-strong disabled:opacity-60"
      >
        {pending ? "Reintentando…" : "Reintentar envío"}
      </button>
      {state.message && !state.success && (
        <p role="alert" className="mt-1 text-xs font-bold text-danger">
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
      className="inline-flex flex-col items-start"
      onSubmit={(event) => {
        if (!window.confirm(`¿Cancelar la invitación de ${parentName}?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-[1.5px] border-danger-border bg-surface-warm px-3 py-2 text-xs font-extrabold text-danger disabled:opacity-60"
      >
        {pending ? "Cancelando…" : "Cancelar invitación"}
      </button>
      {state.message && !state.success && (
        <p role="alert" className="mt-1 text-xs font-bold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ChildProfile({
  child,
  rooms,
  linkedParents,
  invitations,
}: {
  child: Child;
  rooms: Room[];
  linkedParents: ParentLink[];
  invitations: ParentInvitationSummary[];
}) {
  const { locale, dictionary } = useLocale();
  const router = useRouter();
  const [isParentDialogOpen, setIsParentDialogOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<ParentInvitationSummary | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const parentLinkTriggerRef = useRef<HTMLButtonElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );
  const medicalSummary = [
    child.allergyTags.length
      ? dictionary.kids.allergiesSummary.replace("{allergies}", child.allergyTags.join(", "))
      : dictionary.kids.noAllergies,
    child.medicalNotes || dictionary.kids.noMedicalNotes,
  ].join(" ");

  function closeParentDialog() {
    setIsParentDialogOpen(false);
    setEditingInvitation(null);
    router.refresh();
    requestAnimationFrame(() => parentLinkTriggerRef.current?.focus());
  }

  function closeEditDialog() {
    setIsEditDialogOpen(false);
    requestAnimationFrame(() => editTriggerRef.current?.focus());
  }

  return (
    <section className="mx-auto w-full max-w-[820px] px-5 py-8 pb-16 sm:px-10 sm:py-[34px] sm:pb-20">
      <BackLink href={child.status === "archived" ? "/staff/kids?view=archived" : "/staff/kids"} />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-[18px]">
          <div className="flex flex-wrap items-center gap-[18px]">
            <InitialAvatar name={child.fullName} large />
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-[28px] font-semibold text-ink">{child.fullName}</h1>
              <p className="mt-1 text-[15px] text-muted">
                {ageFromIsoDate(child.birthDate, locale)} · {dictionary.kids.room} {child.roomName}
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 rounded-2xl bg-danger-soft p-4 sm:p-[18px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-danger-border text-theme-white-strong">!</span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-danger">{dictionary.kids.allergiesAndNotes}</h2>
              <p className="mt-0.5 break-words text-[14.5px] leading-relaxed text-danger-body">{medicalSummary}</p>
            </div>
          </div>

          <dl className="overflow-hidden rounded-2xl border border-line bg-surface">
            {[
              [dictionary.kids.childDetailsBirthDate, isoToDisplayDate(child.birthDate, locale)],
              [dictionary.kids.childDetailsRoom, child.roomName],
              [dictionary.kids.childDetailsEnrollment, isoToDisplayDate(child.enrolledAt, locale)],
              [dictionary.kids.childDetailsPhotoConsent, child.photoConsent ? dictionary.common.yes : dictionary.common.no],
              [dictionary.kids.childDetailsStatus, child.status === "active" ? dictionary.common.active : dictionary.common.archived],
            ].map(([label, value], index, rows) => (
              <div key={label} className={`flex justify-between gap-4 px-[18px] py-[15px] ${index < rows.length - 1 ? "border-b border-line-soft" : ""}`}>
                <dt className="text-[14.5px] text-muted">{label}</dt>
                <dd className="text-right text-[14.5px] font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="space-y-3">
          <button
            ref={editTriggerRef}
            type="button"
            onClick={() => setIsEditDialogOpen(true)}
            className="block w-full rounded-[14px] bg-ink px-4 py-3 text-center text-sm font-extrabold text-surface-raised"
          >
            {dictionary.kids.editChild}
          </button>
          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-[18px]">
            <h2 className="mb-3.5 text-xs font-extrabold tracking-[0.08em] text-subtle-strong">{dictionary.kids.linkParents}</h2>
            <div className="flex flex-col gap-3.5">
              {linkedParents.length || pendingInvitations.length ? (
                <>
                  {linkedParents.map((parent) => (
                  <div key={parent.id} className="flex items-start gap-3">
                    <InitialAvatar name={parent.fullName} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[14.5px] font-extrabold leading-tight text-ink">{parent.fullName}</p>
                      <p className="mt-1 break-words text-[12.5px] leading-snug text-subtle">{relationshipLabel(parent.relationship, dictionary)}</p>
                      <p className="break-all text-[12.5px] leading-snug text-subtle">{parent.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-success-soft px-2 py-1 text-[10.5px] font-extrabold text-success">{dictionary.common.active}</span>
                  </div>
                  ))}
                  {pendingInvitations.map((invitation) => (
                    <article key={invitation.id} className="rounded-[18px] border border-line-soft bg-surface-warm p-3.5">
                      <header className="mb-3 flex items-center justify-between gap-2">
                        <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-[10.5px] font-extrabold text-warning">{dictionary.common.pending}</span>
                        {child.status === "active" && (
                          <button
                            type="button"
                            aria-label={dictionary.kids.invitationEditLabel.replace("{name}", invitation.fullName)}
                            onClick={() => setEditingInvitation(invitation)}
                            className="flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-surface-muted hover:text-coral-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                          >
                            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                          </button>
                        )}
                      </header>
                      <div className="flex items-start gap-3">
                        <InitialAvatar name={invitation.fullName} />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[15px] font-extrabold leading-tight text-ink">{invitation.fullName}</p>
                          <p className="mt-1.5 text-[12.5px] leading-snug text-subtle">{relationshipLabel(invitation.relationship, dictionary)}</p>
                        </div>
                      </div>
                      <p className="mt-2 whitespace-nowrap text-[12.5px] leading-snug tracking-[-0.01em] text-subtle">{invitation.email}</p>
                      {(invitation.deliveryStatus === "sent" || invitation.deliveryStatus === "failed" || child.status === "active") && (
                        <footer className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
                          {invitation.deliveryStatus === "failed" && (
                            <div className="mr-auto self-center">
                              <p className="text-[11px] font-bold text-danger">{dictionary.kids.deliveryError}</p>
                              <p className="mt-0.5 text-[11px] text-subtle">{dictionary.kids.expires.replace("{date}", isoToDisplayDate(invitation.expiresAt.slice(0, 10), locale))}</p>
                            </div>
                          )}
                          {invitation.deliveryStatus === "failed" && child.status === "active" && (
                              <RetryInvitationButton invitationId={invitation.id} />
                          )}
                          {invitation.deliveryStatus === "sent" && (
                            <div className="mr-auto self-center">
                              <p className="text-[11px] font-bold text-success">{dictionary.kids.emailSent}</p>
                              <p className="mt-0.5 text-[11px] text-subtle">{dictionary.kids.expires.replace("{date}", isoToDisplayDate(invitation.expiresAt.slice(0, 10), locale))}</p>
                            </div>
                          )}
                          {child.status === "active" && (
                            <CancelInvitationButton
                              invitationId={invitation.id}
                              childId={child.id}
                              parentName={invitation.fullName}
                            />
                          )}
                        </footer>
                      )}
                    </article>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted">{dictionary.kids.noLinkedParents}</p>
              )}
              {child.status === "active" && (
                <button
                  ref={parentLinkTriggerRef}
                  type="button"
                  onClick={() => setIsParentDialogOpen(true)}
                  className="flex items-center gap-3 pt-2 text-left"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong text-placeholder">
                    <Icon name="plus" className="size-[18px]" />
                  </span>
                  <span className="text-[14.5px] font-extrabold text-coral-strong">
                    {linkedParents.length || pendingInvitations.length
                      ? dictionary.kids.linkAnotherParent
                      : dictionary.kids.linkParent}
                  </span>
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
      {(isParentDialogOpen || editingInvitation) && (
        <ParentLinkDialog
          childId={child.id}
          childName={child.fullName}
          onClose={closeParentDialog}
          edit={Boolean(editingInvitation)}
          invitationId={editingInvitation?.id}
          initialValues={editingInvitation ? {
            name: editingInvitation.fullName,
            email: editingInvitation.email,
            relationship: editingInvitation.relationship,
          } : undefined}
        />
      )}
      {isEditDialogOpen && (
        <ChildEditDialog child={child} rooms={rooms} onClose={closeEditDialog} />
      )}
    </section>
  );
}

export function KidsReadError({ onRetry }: { onRetry?: () => void }) {
  const { dictionary } = useLocale();
  const router = useRouter();

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-[620px] items-center px-5 py-10">
      <div className="w-full rounded-[22px] border border-line bg-surface p-7 text-center shadow-theme-sm">
        <p className="text-xs font-extrabold tracking-[0.08em] text-coral-deep">{dictionary.kids.noChildrenLoadedLabel}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{dictionary.kids.noChildrenLoadedTitle}</h1>
        <p className="mt-2 text-sm text-muted">{dictionary.kids.noChildrenLoadedDescription}</p>
        <button onClick={onRetry ?? router.refresh} className="mt-5 rounded-[14px] bg-coral px-5 py-3 text-sm font-extrabold text-theme-white-strong">
          {dictionary.common.retry}
        </button>
      </div>
    </section>
  );
}
