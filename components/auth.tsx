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
import { clearLogoutHistoryMarker } from "@/components/shared/logout-history";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { createClient } from "@/utils/supabase/client";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import type { Dictionary } from "@/utils/i18n/dictionary";

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

export function LoginScreen({
  invite = "",
  activation = "",
  dictionary,
}: {
  invite?: string;
  activation?: string;
  dictionary: Dictionary;
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
        <div className="w-full max-w-[392px]">
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
        </div>
      </section>
    </main>
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
