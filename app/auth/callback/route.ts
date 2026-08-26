import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import {
  getRecoveryFlowCookieOptions,
  RECOVERY_FLOW_COOKIE,
  RECOVERY_FLOW_PATH,
  RECOVERY_FLOW_VALUE,
} from "@/utils/auth/recovery";

const TOKEN_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i;

function errorRedirect(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/login?activation=error", request.url),
  );
}

function recoveryErrorRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?recovery=error", request.url));
}

function recoveryRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL(RECOVERY_FLOW_PATH, request.url));
  response.cookies.set({
    ...getRecoveryFlowCookieOptions(),
    name: RECOVERY_FLOW_COOKIE,
    value: RECOVERY_FLOW_VALUE,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const invite = request.nextUrl.searchParams.get("invite")?.trim().toUpperCase();
  const hasInviteParam = request.nextUrl.searchParams.has("invite");
  const next = request.nextUrl.searchParams.get("next");

  if (hasInviteParam) {
    if (!code || !invite || !TOKEN_PATTERN.test(invite)) {
      return errorRedirect(request);
    }

    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return errorRedirect(request);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email_confirmed_at) {
      await supabase.auth.signOut();
      return errorRedirect(request);
    }

    const { error: acceptanceError } = await supabase.rpc(
      "accept_parent_invitation",
      {
        p_token: invite,
        p_full_name:
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name
            : "Invitado/a",
      },
    );

    await supabase.auth.signOut();

    if (acceptanceError) {
      return errorRedirect(request);
    }

    return NextResponse.redirect(
      new URL("/login?activation=success", request.url),
    );
  }

  if (!code || next !== RECOVERY_FLOW_PATH) {
    return recoveryErrorRedirect(request);
  }

  const supabase = await createClient();
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    return recoveryErrorRedirect(request);
  }

  return recoveryRedirect(request);
}
