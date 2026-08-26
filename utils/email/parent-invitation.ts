import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";
import { getPublicAppUrl } from "@/utils/email/resend";
import { getDictionary, getIntlLocale, type Locale } from "@/utils/i18n/dictionary";

const PARENT_INVITATION_TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PARENT_INVITATION_TOKEN_LENGTH = 5;
const ENVELOPE_VERSION = "v1";
const ENVELOPE_AAD = "opendaycare:parent-invitation:v1";
const TOKEN_PATTERN = new RegExp(
  `^[${PARENT_INVITATION_TOKEN_ALPHABET}]{${PARENT_INVITATION_TOKEN_LENGTH}}$`,
);

export type ParentInvitationRelationship = "father" | "mother" | "guardian";

export type ParentInvitationEmailInput = {
  fullName: string;
  childName: string;
  daycareName: string;
  relationship: ParentInvitationRelationship;
  token: string;
  expiresAt: string;
  locale: Locale;
};

function requiredInvitationKey() {
  const value = process.env.PARENT_INVITATION_CODE_KEY?.trim();

  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(
      "PARENT_INVITATION_CODE_KEY must be 64 hexadecimal characters",
    );
  }

  return Buffer.from(value, "hex");
}

function normalizeParentInvitationToken(token: string) {
  const normalized = token.trim().toUpperCase();

  if (!TOKEN_PATTERN.test(normalized)) {
    throw new Error("Invalid parent invitation token");
  }

  return normalized;
}

export function generateParentInvitationToken() {
  return Array.from(
    { length: PARENT_INVITATION_TOKEN_LENGTH },
    () =>
      PARENT_INVITATION_TOKEN_ALPHABET[
        randomInt(PARENT_INVITATION_TOKEN_ALPHABET.length)
      ],
  ).join("");
}

export function hashParentInvitationToken(token: string) {
  return createHash("sha256")
    .update(normalizeParentInvitationToken(token), "utf8")
    .digest("hex");
}

/**
 * Envelope format: v1.<base64url iv>.<base64url auth tag>.<base64url ciphertext>.
 * PARENT_INVITATION_CODE_KEY is a 32-byte key represented as 64 hex characters.
 */
export function encryptParentInvitationToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", requiredInvitationKey(), iv);

  cipher.setAAD(Buffer.from(ENVELOPE_AAD, "utf8"));

  const ciphertext = Buffer.concat([
    cipher.update(normalizeParentInvitationToken(token), "utf8"),
    cipher.final(),
  ]);

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptParentInvitationToken(envelope: string) {
  const [version, encodedIv, encodedAuthTag, encodedCiphertext] =
    envelope.split(".");

  if (
    version !== ENVELOPE_VERSION ||
    !encodedIv ||
    !encodedAuthTag ||
    !encodedCiphertext
  ) {
    throw new Error("Invalid parent invitation ciphertext");
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const authTag = Buffer.from(encodedAuthTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");

  if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid parent invitation ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    requiredInvitationKey(),
    iv,
  );

  decipher.setAAD(Buffer.from(ENVELOPE_AAD, "utf8"));
  decipher.setAuthTag(authTag);

  try {
    return normalizeParentInvitationToken(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
        "utf8",
      ),
    );
  } catch {
    throw new Error("Invalid parent invitation ciphertext");
  }
}

export function getParentInvitationActivationUrl(token: string) {
  const url = new URL("/activate", getPublicAppUrl());
  url.searchParams.set("code", normalizeParentInvitationToken(token));
  return url.toString();
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function relationshipLabel(relationship: ParentInvitationRelationship, locale: Locale) {
  const dictionary = getDictionary(locale);
  return dictionary.invitations[
    relationship === "mother" ? "mother" : relationship === "father" ? "father" : "guardian"
  ] as string;
}

function formatExpiration(expiresAt: string, locale: Locale) {
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid parent invitation expiration");
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function buildParentInvitationEmail(input: ParentInvitationEmailInput) {
  const token = normalizeParentInvitationToken(input.token);
  const activationUrl = getParentInvitationActivationUrl(token);
  const dictionary = getDictionary(input.locale);
  const expiration = formatExpiration(input.expiresAt, input.locale);
  const relationship = relationshipLabel(input.relationship, input.locale);
  const subject = dictionary.email.subject.replace("{child}", input.childName);

  const fullName = escapeHtml(input.fullName);
  const childName = escapeHtml(input.childName);
  const daycareName = escapeHtml(input.daycareName);
  const escapedRelationship = escapeHtml(relationship);
  const escapedActivationUrl = escapeHtml(activationUrl);
  const escapedExpiration = escapeHtml(expiration);

  return {
    subject,
    html: `<!doctype html>
<html lang="${input.locale}">
  <body style="margin:0;background:#fbf4ec;color:#3f332c;font-family:Arial,sans-serif;line-height:1.5">
    <main style="max-width:560px;margin:0 auto;padding:32px 20px">
      <section style="background:#ffffff;border:1px solid #eadfd0;border-radius:20px;padding:32px">
        <p style="margin:0 0 8px;color:#c5503a;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">OpenDayCare</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2">${dictionary.email.heading.replace("{child}", childName)}</h1>
        <p>${dictionary.email.greeting.replace("{name}", fullName)}</p>
        <p>${dictionary.email.invitation.replace("{daycare}", daycareName).replace("{relationship}", `<strong>${escapedRelationship}</strong>`).replace("{child}", `<strong>${childName}</strong>`)}</p>
        <p style="margin:24px 0 8px;font-size:13px;color:#75675d">${dictionary.email.activationCode}</p>
        <p style="margin:0 0 24px;font-size:30px;font-weight:700;letter-spacing:.18em;color:#c5503a">${token}</p>
        <p style="margin:0 0 24px"><a href="${escapedActivationUrl}" style="display:inline-block;border-radius:12px;background:#ee8164;color:#ffffff;padding:13px 18px;text-decoration:none;font-weight:700">${dictionary.email.activateAccount}</a></p>
        <p style="font-size:14px;color:#75675d">${dictionary.email.manualCode} ${dictionary.email.expires.replace("{date}", escapedExpiration)}</p>
      </section>
    </main>
  </body>
</html>`,
    text: `${dictionary.email.greeting.replace("{name}", input.fullName)}

${dictionary.email.invitation.replace("{daycare}", input.daycareName).replace("{relationship}", relationship).replace("{child}", input.childName)}

${dictionary.email.textActivation.replace("{url}", activationUrl)}

${dictionary.email.textCode.replace("{token}", token)}

${dictionary.email.textExpires.replace("{date}", expiration)}
${dictionary.email.textManualCode}

OpenDayCare`,
  };
}
