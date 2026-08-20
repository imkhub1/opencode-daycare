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
  signUpParentAccount,
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
  name,
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
  name?: string;
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
        name={name}
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? email).trim();
    const submittedPassword = String(formData.get("password") ?? password);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password: submittedPassword,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    const safeInvite = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i.test(invite.trim())
      ? invite.trim().toUpperCase()
      : "";
    const destination = safeInvite
      ? `/activate?code=${encodeURIComponent(safeInvite)}`
      : "/";
    window.location.assign(destination);
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
          {activation === "pending" && (
            <p role="status" className="mb-5 rounded-xl bg-[#fff1c7] px-4 py-3 text-sm font-bold text-[#8a7234]">
              Revisa tu correo para confirmar la cuenta y completar la activación.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <Field
              label="EMAIL"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Field
              label="CONTRASEÑA"
              name="password"
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
  authenticated = false,
  blockedSession = false,
}: {
  token: string;
  authenticated?: boolean;
  blockedSession?: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken.trim().toUpperCase());
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(true);

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token.trim() || !email.trim() || !name.trim() || password.length < 8) {
      setError("Ingresa el código, email, nombre y contraseña (mínimo 8 caracteres).");
      return;
    }

    setIsLoading(true);
    const result = await signUpParentAccount({
      token,
      fullName: name,
      email,
      password,
    });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(
      result.awaitingConfirmation
        ? "/login?activation=pending"
        : "/login?activation=success",
    );
  }

  async function acceptExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token.trim() || !name.trim()) {
      setError("Ingresa el código de invitación y tu nombre.");
      return;
    }
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
        <p className="mb-[26px] text-[15.5px] leading-relaxed text-muted">Te invitaron a seguir el día de tu hijo. Completa tus datos para activar la cuenta.</p>

        {blockedSession ? (
          <div role="alert" className="rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold leading-relaxed text-[#c5413a]">
            Cierra la sesión actual y vuelve a abrir este enlace con la cuenta del padre invitado.
          </div>
        ) : (
          <form onSubmit={authenticated ? acceptExisting : submitSignup}>
            <Field
              label="CÓDIGO DE INVITACIÓN"
              value={token}
              onChange={(event) => setToken(event.target.value.toUpperCase())}
              autoComplete="one-time-code"
              required
              className="font-display font-bold tracking-[3px]"
            />
            {!authenticated && (
              <Field
                label="EMAIL AL QUE RECIBISTE LA INVITACIÓN"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            )}
            <Field
              label="NOMBRE PARA TU CUENTA"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
            {!authenticated && (
              <Field
                label="CREAR CONTRASEÑA"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="border-[#f2a78e]"
              />
            )}
            <label
              htmlFor="activation-photo-consent"
              className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#fbf1d6] p-[14px_16px]"
            >
              <input
                id="activation-photo-consent"
                type="checkbox"
                checked={photoConsent}
                onChange={(event) => setPhotoConsent(event.target.checked)}
                className="mt-0.5 size-6 shrink-0 accent-[#5fb97e]"
              />
              <span className="text-sm leading-[1.45] text-[#8a7234]">Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app.</span>
            </label>
            {error && <p role="alert" className="mb-4 rounded-xl bg-[#fbdad6] px-4 py-3 text-sm font-bold text-[#c5413a]">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full rounded-[15px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-lg shadow-[#ee8164]/35 disabled:opacity-60">
              {isLoading ? "Procesando…" : authenticated ? "Aceptar invitación" : "Activar mi cuenta"}
            </button>
          </form>
        )}

        {!authenticated && (
          <p className="mt-[22px] text-center text-[14.5px] text-muted">
            ¿Ya tenés cuenta? <Link href={`/login?invite=${encodeURIComponent(token)}`} className="font-extrabold text-[#c5503a]">Iniciar sesión</Link>
          </p>
        )}
      </section>
    </main>
  );
}
