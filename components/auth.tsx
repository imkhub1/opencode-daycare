"use client";

import Link from "next/link";
import {
  type ChangeEventHandler,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  acceptExistingParentInvitation,
  signUpParentAccount,
} from "@/app/activate/actions";
import { Icon } from "@/components/open-daycare";
import { clearLogoutHistoryMarker } from "@/components/shared/logout-history";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { createClient } from "@/utils/supabase/client";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLocale } from "@/components/shared/LocaleProvider";
import type { Dictionary } from "@/utils/i18n/dictionary";

const RECOVERY_EMAIL_REDIRECT = "/auth/callback?next=/reset-password";

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
        className={`flex size-[46px] items-center justify-center rounded-[14px] ${inverse ? "bg-control-overlay" : "bg-brand-gradient shadow-theme-sm"}`}
      >
        <Icon name="sun" className="size-6.5 text-theme-white-strong" />
      </span>
      {showName && (
        <span
          className={`font-display text-[21px] font-semibold tracking-wide ${inverse ? "text-theme-white-strong" : "text-ink"}`}
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
        className={`w-full rounded-[14px] border-[1.5px] border-line bg-surface-raised px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-placeholder ${className}`}
      />
    </label>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  const { dictionary } = useLocale();

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-gradient p-[56px_60px] text-theme-white-strong lg:flex lg:flex-col lg:justify-between">
        <span className="absolute -right-[120px] -top-[140px] size-[420px] rounded-full bg-theme-white-strong/12" />
        <span className="absolute -bottom-[110px] -left-20 size-[300px] rounded-full bg-theme-white-strong/10" />
        <div className="relative">
          <AuthLogo inverse />
        </div>
        <div className="relative">
          <h1 className="mb-[18px] font-display text-[42px] leading-[1.12] font-semibold">
            {dictionary.auth.heroTitle}
          </h1>
          <p className="max-w-[430px] text-[17px] leading-relaxed text-theme-white-strong/90">
            {dictionary.auth.heroDescription}
          </p>
        </div>
        <p className="relative text-sm text-theme-white-strong/90">{dictionary.auth.heroFooter}</p>
      </section>
      <section className="relative flex items-center justify-center px-5 py-10 sm:p-10">
        <ThemeToggle className="absolute right-5 top-5 sm:right-10 sm:top-10" />
        <div className="w-full max-w-[392px]">{children}</div>
      </section>
    </main>
  );
}

export function LoginScreen({
  invite = "",
  activation = "",
  recovery = "",
  dictionary,
}: {
  invite?: string;
  activation?: string;
  recovery?: string;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function openRecovery() {
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/forgot-password${query}`);
  }

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

    clearLogoutHistoryMarker();
    const safeInvite = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i.test(invite.trim())
      ? invite.trim().toUpperCase()
      : "";
    const destination = safeInvite
      ? `/activate?code=${encodeURIComponent(safeInvite)}`
      : "/";
    window.location.assign(destination);
  }

  return (
    <AuthShell>
          <div className="mb-1.5 flex items-start justify-between gap-4">
            <h1 className="font-display text-[30px] font-semibold text-ink">
              {dictionary.auth.loginTitle}
            </h1>
            <LanguageSwitcher />
          </div>
          <p className="mb-7 text-[15px] text-muted">
            {dictionary.auth.loginSubtitle}
          </p>
          {activation === "success" && (
            <p role="status" className="mb-5 rounded-xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
              {dictionary.auth.activationSuccess}
            </p>
          )}
          {activation === "error" && (
            <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
              {dictionary.auth.activationError}
            </p>
          )}
          {activation === "pending" && (
            <p role="status" className="mb-5 rounded-xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning">
              {dictionary.auth.activationPending}
            </p>
          )}
          {recovery === "success" && (
            <p role="status" className="mb-5 rounded-xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
              Tu contraseña fue actualizada. Ya puedes iniciar sesión.
            </p>
          )}
          {recovery === "error" && (
            <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
              El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <Field
              label={dictionary.auth.email}
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Field
              label={dictionary.auth.password}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={dictionary.auth.passwordPlaceholder}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={openRecovery}
              className="mb-5 block w-full text-right text-[13.5px] font-bold text-coral-strong"
            >
              {dictionary.auth.forgotPassword}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="block w-full rounded-[15px] bg-coral-gradient px-4 py-[15px] text-center text-base font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? dictionary.auth.loggingIn : dictionary.auth.login}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-coral-strong">
                {error}
              </p>
            )}
          </form>
          <p className="mt-6 text-center text-[14.5px] text-muted">
            {dictionary.auth.invitedPrompt}{" "}
            <Link href="/activate" className="font-extrabold text-coral-strong">
              {dictionary.auth.activateAccount}
            </Link>
          </p>
    </AuthShell>
  );
}

export function ForgotPasswordScreen({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    setError("");

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Ingresa un email válido.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}${RECOVERY_EMAIL_REDIRECT}` },
      );

      if (resetError) {
        setError("No se pudo procesar la solicitud. Intenta nuevamente.");
        return;
      }

      setStatus("success");
    } catch {
      setError("No se pudo procesar la solicitud. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-[22px]"><AuthLogo showName={false} /></div>
      <h1 className="mb-1.5 font-display text-[30px] font-semibold text-ink">Recuperar contraseña</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-muted">Ingresa tu email y te enviaremos instrucciones para crear una nueva contraseña.</p>
      {status === "success" ? (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm font-bold leading-relaxed text-success">
          Si existe una cuenta asociada a ese email, recibirás un enlace para recuperar tu contraseña. Revisa también tu carpeta de spam.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="EMAIL"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full rounded-[15px] bg-coral-gradient px-4 py-[15px] text-center text-base font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? "Enviando…" : "Enviar instrucciones"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-[14.5px] text-muted">
        <Link href="/login" className="font-extrabold text-coral-strong">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordScreen({ hasRecoveryMarker }: { hasRecoveryMarker: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(hasRecoveryMarker);
  const [error, setError] = useState(hasRecoveryMarker ? "" : "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    createClient().auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) return;
      const sessionIsValid = Boolean(data.session) && !sessionError;
      setHasSession(sessionIsValid);
      setIsCheckingSession(false);
      if (hasRecoveryMarker && !sessionIsValid) {
        setError("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.");
      }
    }).catch(() => {
      if (!isMounted) return;
      setHasSession(false);
      setIsCheckingSession(false);
      if (hasRecoveryMarker) {
        setError("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [hasRecoveryMarker]);

  const canUpdate = hasRecoveryMarker && hasSession && !isCheckingSession;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!canUpdate) {
      setError("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo nuevamente.");
        return;
      }

      let clearResponse: Response;
      try {
        clearResponse = await fetch("/auth/recovery/complete", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        setError("La contraseña fue actualizada, pero no pudimos cerrar este enlace de recuperación. Cierra esta pestaña e inicia sesión nuevamente.");
        return;
      }

      if (!clearResponse.ok) {
        setError("La contraseña fue actualizada, pero no pudimos cerrar este enlace de recuperación. Cierra esta pestaña e inicia sesión nuevamente.");
        return;
      }

      let signOutError;
      try {
        ({ error: signOutError } = await supabase.auth.signOut({ scope: "local" }));
      } catch {
        setError("La contraseña fue actualizada. Cierra esta pestaña e inicia sesión nuevamente.");
        return;
      }

      if (signOutError) {
        setError("La contraseña fue actualizada. Cierra esta pestaña e inicia sesión nuevamente.");
        return;
      }

      router.replace("/login?recovery=success");
    } catch {
      setError("No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-[22px]"><AuthLogo showName={false} /></div>
      <h1 className="mb-1.5 font-display text-[30px] font-semibold text-ink">Crear nueva contraseña</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-muted">Elige una contraseña nueva para volver a entrar a tu cuenta.</p>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="NUEVA CONTRASEÑA"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={!canUpdate || isLoading}
        />
        <Field
          label="CONFIRMAR CONTRASEÑA"
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          disabled={!canUpdate || isLoading}
        />
        {isCheckingSession && <p role="status" className="mb-4 rounded-xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning">Verificando el enlace de recuperación…</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold leading-relaxed text-danger">{error}</p>}
        <button type="submit" disabled={!canUpdate || isLoading} className="w-full rounded-[15px] bg-coral-gradient px-4 py-[15px] text-center text-base font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>
      <p className="mt-6 text-center text-[14.5px] text-muted">
        <Link href="/login" className="font-extrabold text-coral-strong">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}

export function ActivateScreen({
  token: initialToken,
  authenticated = false,
  blockedSession = false,
  dictionary,
}: {
  token: string;
  authenticated?: boolean;
  blockedSession?: boolean;
  dictionary: Dictionary;
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
      setError(dictionary.auth.activationValidation);
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
      setError(dictionary.auth.activationExistingValidation);
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
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-5 py-10 sm:p-10">
      <ThemeToggle className="absolute right-5 top-5 sm:right-10 sm:top-10" />
      <section className="w-full max-w-[440px]">
        <div className="mb-[22px]"><AuthLogo showName={false} /></div>
        <div className="mb-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">{dictionary.auth.activationTitle}</h1>
          <LanguageSwitcher />
        </div>
        <p className="mb-[26px] text-[15.5px] leading-relaxed text-muted">{dictionary.auth.activationDescription}</p>

        {blockedSession ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold leading-relaxed text-danger">
            {dictionary.auth.blockedSession}
          </div>
        ) : (
          <form onSubmit={authenticated ? acceptExisting : submitSignup}>
            <Field
              label={dictionary.auth.invitationCode}
              value={token}
              onChange={(event) => setToken(event.target.value.toUpperCase())}
              autoComplete="one-time-code"
              required
              className="font-display font-bold tracking-[3px]"
            />
            {!authenticated && (
              <Field
                label={dictionary.auth.invitedEmail}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            )}
            <Field
              label={dictionary.auth.accountName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
            {!authenticated && (
              <Field
                label={dictionary.auth.createPassword}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="border-coral"
              />
            )}
            <label
              htmlFor="activation-photo-consent"
              className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-warning-panel p-[14px_16px]"
            >
              <input
                id="activation-photo-consent"
                type="checkbox"
                checked={photoConsent}
                onChange={(event) => setPhotoConsent(event.target.checked)}
                className="mt-0.5 size-6 shrink-0 accent-success"
              />
              <span className="text-sm leading-[1.45] text-warning">{dictionary.auth.photoConsent}</span>
            </label>
            {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full rounded-[15px] bg-coral-gradient px-4 py-[15px] text-center text-base font-extrabold text-theme-white-strong shadow-theme-sm disabled:opacity-60">
              {isLoading ? dictionary.auth.processing : authenticated ? dictionary.auth.acceptInvitation : dictionary.auth.activateMyAccount}
            </button>
          </form>
        )}

        {!authenticated && (
          <p className="mt-[22px] text-center text-[14.5px] text-muted">
            {dictionary.auth.alreadyHaveAccount} <Link href={`/login?invite=${encodeURIComponent(token)}`} className="font-extrabold text-coral-strong">{dictionary.auth.login}</Link>
          </p>
        )}
      </section>
    </main>
  );
}
