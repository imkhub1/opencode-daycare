"use client";

import Link from "next/link";
import {
  type ChangeEventHandler,
  type FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  acceptExistingParentInvitation,
  getActivationPreview,
  signUpParentAccount,
  type ActivationPreview,
} from "@/app/activate/actions";
import { Icon } from "@/components/open-daycare";
import { createClient } from "@/utils/supabase/client";

function AuthLogo({
  inverse = false,
  showName = true,
}: {
  inverse?: boolean;
  showName?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-[46px] items-center justify-center rounded-[14px] ${inverse ? "bg-white/20" : "bg-linear-to-br from-[#f8c3a8] to-[#f2937a] shadow-lg shadow-[#ee8164]/25"}`}
      >
        <Icon name="sun" className="size-6.5 text-white" />
      </span>
      {showName && (
        <span
          className={`font-display text-[21px] font-semibold tracking-wide ${inverse ? "text-white" : "text-ink"}`}
        >
          OpenDayCare
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  readOnly = false,
  disabled = false,
  className = "",
}: {
  label: string;
  type?: "email" | "password" | "text";
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className="mb-[18px] block">
      <span className="mb-2 block text-xs font-extrabold tracking-[0.07em] text-muted">
        {label}
      </span>
      <input
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        className={`w-full rounded-[14px] border-[1.5px] border-[#eadfd0] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#b6a99b] ${className}`}
      />
    </label>
  );
}

export function LoginScreen({
  invite = "",
  activation = "",
}: {
  invite?: string;
  activation?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    const safeInvite = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i.test(invite.trim())
      ? invite.trim().toUpperCase()
      : "";
    router.push(
      safeInvite
        ? `/activate?code=${encodeURIComponent(safeInvite)}`
        : "/",
    );
  }

  return (
    <main className="grid min-h-screen bg-[#fbf4ec] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-linear-[155deg] from-[#f6a98e] via-[#f2937a] to-[#ec7e62] p-[56px_60px] text-white lg:flex lg:flex-col lg:justify-between">
        <span className="absolute -right-[120px] -top-[140px] size-[420px] rounded-full bg-white/12" />
        <span className="absolute -bottom-[110px] -left-20 size-[300px] rounded-full bg-white/10" />
        <div className="relative">
          <AuthLogo inverse />
        </div>
        <div className="relative">
          <h1 className="mb-[18px] font-display text-[42px] leading-[1.12] font-semibold">
            El día de cada niño,
            <br />
            compartido con su familia.
          </h1>
          <p className="max-w-[430px] text-[17px] leading-relaxed text-white/90">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>
        <p className="relative text-sm text-white/90">Guardería Sala Soles</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:p-10">
        <div className="w-full max-w-[392px]">
          <h1 className="mb-1.5 font-display text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h1>
          <p className="mb-7 text-[15px] text-muted">
            Ingresá para ver el día de hoy.
          </p>
          {activation === "success" && (
            <p role="status" className="mb-5 rounded-xl bg-[#cfebd8] px-4 py-3 text-sm font-bold text-[#3e8b62]">
              Tu cuenta fue activada y el vínculo con el niño quedó confirmado.
            </p>
          )}
          {activation === "error" && (
            <p role="alert" className="mb-5 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">
              No se pudo completar la activación. Revisa el enlace e inténtalo nuevamente.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <Field
              label="EMAIL"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Field
              label="CONTRASEÑA"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="mb-5 block w-full text-right text-[13.5px] font-bold text-[#c5503a]"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="block w-full rounded-[15px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-lg shadow-[#ee8164]/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-[#c5503a]">
                {error}
              </p>
            )}
          </form>
          <p className="mt-6 text-center text-[14.5px] text-muted">
            ¿Te invitó la guardería?{" "}
            <Link href="/activate" className="font-extrabold text-[#c5503a]">
              Activá tu cuenta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export function ActivateScreen({
  token: initialToken,
  preview: initialPreview,
  authenticated = false,
}: {
  token: string;
  preview: ActivationPreview | null;
  authenticated?: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken.trim().toUpperCase());
  const [preview, setPreview] = useState(initialPreview);
  const [name, setName] = useState(initialPreview?.invitedFullName ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [now] = useState(() => Date.now());
  const initialError = initialToken && !initialPreview
    ? "El código no es válido o ya no está disponible."
    : "";

  const previewIsUsable = Boolean(
    preview &&
      preview.status === "pending" &&
      preview.deliveryStatus === "sent" &&
      new Date(preview.expiresAt).getTime() > now,
  );

  async function lookupToken(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    const nextPreview = await getActivationPreview(token);
    setPreview(nextPreview);
    if (!nextPreview) setError("El código no es válido o ya no está disponible.");
    else setName(nextPreview.invitedFullName);
    setIsLoading(false);
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!previewIsUsable || !preview || !name.trim() || password.length < 8) {
      setError("Ingresa un nombre y una contraseña de al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);
    const result = await signUpParentAccount({
      token,
      fullName: name,
      email: preview.email,
      password,
    });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Revisa tu correo para confirmar la cuenta. Después volverás aquí para completar la activación.");
  }

  async function acceptExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await acceptExistingParentInvitation(token, name);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/login?activation=success");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf4ec] px-5 py-10 sm:p-10">
      <section className="w-full max-w-[440px]">
        <div className="mb-[22px]"><AuthLogo showName={false} /></div>
        <h1 className="mb-2 font-display text-[32px] leading-[1.15] font-semibold text-ink">Bienvenida a OpenDayCare</h1>
        <p className="mb-[26px] text-[15.5px] leading-relaxed text-muted">Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta.</p>

        {!previewIsUsable && (
          <form onSubmit={lookupToken} className="mb-5 rounded-2xl border border-line bg-white p-4">
            <Field
              label="CÓDIGO DE INVITACIÓN"
              value={token}
              onChange={(event) => setToken(event.target.value.toUpperCase())}
              autoComplete="one-time-code"
              className="mb-3 font-display text-lg font-bold tracking-[3px]"
            />
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">
              {isLoading ? "Buscando…" : "Continuar"}
            </button>
          </form>
        )}

        {previewIsUsable && preview ? (
          <>
            <div className="mb-[22px] flex items-center gap-[14px] rounded-2xl border-[1.5px] border-[#eadfd0] bg-white p-[14px_16px]">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#a9d9e8] font-display text-[19px] font-semibold text-[#1f7a93]">{preview.childName.charAt(0)}</span>
              <div className="min-w-0">
                <p className="text-[13px] text-muted">Te invitaron a seguir a</p>
                <p className="truncate font-display text-[17px] font-semibold text-ink">{preview.childName} · {preview.daycareName}</p>
              </div>
            </div>

            <form onSubmit={authenticated ? acceptExisting : submitSignup}>
              <Field label="EMAIL" type="email" value={preview.email} readOnly disabled className="bg-[#f5eee6]" />
              <Field label="NOMBRE PARA TU CUENTA" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              {!authenticated && (
                <Field label="CREAR CONTRASEÑA" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required className="border-[#f2a78e]" />
              )}
              <div className="mb-6 flex items-start gap-3 rounded-[14px] bg-[#fbf1d6] p-[14px_16px]">
                <span aria-hidden="true" className="mt-px flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#5fb97e] text-white">✓</span>
                <p className="text-sm leading-[1.45] text-[#8a7234]">Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app.</p>
              </div>
              {message && <p role="status" className="mb-4 rounded-xl bg-[#cfebd8] px-4 py-3 text-sm font-bold text-[#3e8b62]">{message}</p>}
              {error && <p role="alert" className="mb-4 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">{error}</p>}
              <button type="submit" disabled={isLoading} className="w-full rounded-[15px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-lg shadow-[#ee8164]/35 disabled:opacity-60">
                {isLoading ? "Procesando…" : authenticated ? "Aceptar invitación" : "Activar mi cuenta"}
              </button>
            </form>

            {!authenticated && (
              <p className="mt-[22px] text-center text-[14.5px] text-muted">
                ¿Ya tenés cuenta? <Link href={`/login?invite=${encodeURIComponent(token)}`} className="font-extrabold text-[#c5503a]">Iniciar sesión</Link>
              </p>
            )}
          </>
        ) : (
          !error && <p className="rounded-xl bg-[#fffaf2] px-4 py-3 text-sm text-muted">Ingresa el código de cinco caracteres que recibiste por correo.</p>
        )}
         {(error || initialError) && !preview && <p role="alert" className="mt-4 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">{error || initialError}</p>}
      </section>
    </main>
  );
}
