"use server";

import { createClient } from "@/utils/supabase/server";

const GENERIC_ERROR = "El código no es válido o ya no está disponible.";

function validToken(token: string) {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i.test(token.trim());
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { ok: false as const, message: GENERIC_ERROR };

  const confirmationUrl = new URL("/auth/callback", appUrl);
  confirmationUrl.searchParams.set("invite", normalizedToken);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: confirmationUrl.toString(),
      data: {
        invite_token: normalizedToken,
        display_name: normalizedName,
      },
    },
  });

  if (error || !data.user) {
    if (data.session) await supabase.auth.signOut();
    return {
      ok: false as const,
      message: GENERIC_ERROR,
    };
  }

  if (!data.session) return { ok: true as const, awaitingConfirmation: true as const };

  const { data: acceptance, error: acceptanceError } = await supabase.rpc(
    "accept_parent_invitation",
    {
      p_token: normalizedToken,
      p_full_name: normalizedName,
    },
  );

  await supabase.auth.signOut();

  if (acceptanceError || !acceptance?.[0]) {
    return { ok: false as const, message: GENERIC_ERROR };
  }

  return { ok: true as const, awaitingConfirmation: false as const };
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
