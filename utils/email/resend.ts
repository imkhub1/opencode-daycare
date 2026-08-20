import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

function requiredServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required server configuration: ${name}`);
  }

  return value;
}

export function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(requiredServerEnv("RESEND_API_KEY"));
  }

  return resendClient;
}

export function getResendFromEmail() {
  return requiredServerEnv("RESEND_FROM_EMAIL");
}

export function getResendReplyTo() {
  const value = process.env.RESEND_REPLY_TO?.trim();
  return value || undefined;
}

export function getPublicAppUrl() {
  const value = requiredServerEnv("NEXT_PUBLIC_APP_URL");
  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must be a public HTTP(S) URL");
  }

  return url.origin;
}

export function getParentInvitationIdempotencyKey(invitationId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
    throw new Error("Invalid parent invitation id");
  }

  return `parent-invitation/${invitationId}`;
}

export function normalizeResendError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Email delivery failed";
  }

  const candidate = error as { name?: unknown; statusCode?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const statusCode =
    typeof candidate.statusCode === "number" &&
    Number.isInteger(candidate.statusCode) &&
    candidate.statusCode >= 400 &&
    candidate.statusCode <= 599
      ? candidate.statusCode
      : null;

  if (/^[a-z_]+$/.test(name)) {
    return `Email delivery failed (${name}${statusCode ? `, ${statusCode}` : ""})`;
  }

  return statusCode
    ? `Email delivery failed (${statusCode})`
    : "Email delivery failed";
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  try {
    const { data, error } = await getResendClient().emails.send(
      {
        from: getResendFromEmail(),
        to,
        subject,
        html,
        text,
        ...(getResendReplyTo() ? { replyTo: getResendReplyTo() } : {}),
      },
      { idempotencyKey },
    );

    if (error || !data?.id) {
      return {
        ok: false as const,
        error: normalizeResendError(error),
      };
    }

    return {
      ok: true as const,
      emailId: data.id,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: normalizeResendError(error),
    };
  }
}
