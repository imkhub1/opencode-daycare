"use server";

import { createClient } from "@/utils/supabase/server";

const GENERIC_ERROR = "El código no es válido o ya no está disponible.";

export type ActivationPreview = {
  childName: string;
  daycareName: string;
  invitedFullName: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  status: "pending" | "accepted" | "expired" | "cancelled";
  deliveryStatus: "sent" | "failed";
  expiresAt: string;
};

function validToken(token: string) {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i.test(token.trim());
}

export async function getActivationPreview(
  token: string,
): Promise<ActivationPreview | null> {
  const normalizedToken = token.trim().toUpperCase();
  if (!validToken(normalizedToken)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: normalizedToken,
  });
  const row = data?.[0];

  if (
    error ||
    !row ||
    row.status !== "pending" ||
    row.delivery_status !== "sent" ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  return {
    childName: row.child_name,
    daycareName: row.daycare_name,
    invitedFullName: row.invited_full_name,
    email: row.email,
    relationship: row.relationship,
    status: row.status,
    deliveryStatus: row.delivery_status,
    expiresAt: row.expires_at,
  };
}

export async function signUpParentAccount({
  token,
  fullName,
  email,
  password,
}: {
  token: string;
  fullName: string;
  email: string;
  password: string;
}) {
  const normalizedToken = token.trim().toUpperCase();
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !validToken(normalizedToken) ||
    !normalizedName ||
    normalizedName.length > 120 ||
    !normalizedEmail ||
    password.length < 8
  ) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  const preview = await getActivationPreview(normalizedToken);
  if (
    !preview ||
    preview.status !== "pending" ||
    preview.deliveryStatus !== "sent" ||
    preview.email.toLowerCase() !== normalizedEmail ||
    new Date(preview.expiresAt).getTime() <= Date.now()
  ) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return { ok: false as const, message: GENERIC_ERROR };

  let callbackUrl: string;
  try {
    callbackUrl = `${new URL(appUrl).origin}/auth/callback?invite=${encodeURIComponent(normalizedToken)}`;
  } catch {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        invite_token: normalizedToken,
        display_name: normalizedName,
      },
    },
  });

  if (error || data.session) {
    if (data.session) await supabase.auth.signOut();
    return { ok: false as const, message: GENERIC_ERROR };
  }

  return { ok: true as const };
}

export async function acceptExistingParentInvitation(
  token: string,
  fullName: string,
) {
  const normalizedToken = token.trim().toUpperCase();
  const normalizedName = fullName.trim();

  if (!validToken(normalizedToken) || !normalizedName) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  const { data, error } = await supabase.rpc("accept_parent_invitation", {
    p_token: normalizedToken,
    p_full_name: normalizedName,
  });

  if (error || !data?.[0]) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  await supabase.auth.signOut();
  return { ok: true as const };
}
