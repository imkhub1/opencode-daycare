import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const publicRoutes = new Set(["/login", "/activate", "/auth/callback"]);

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  sessionResponse: NextResponse,
) {
  const response = NextResponse.redirect(new URL(pathname, request.url));

  // Keep refreshed Supabase cookies and their anti-cache headers on redirects.
  sessionResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((name) => {
    const value = sessionResponse.headers.get(name);
    if (value) response.headers.set(name, value);
  });

  return response;
}

export async function proxy(request: NextRequest) {
  const { claims, response } = await updateSession(request);
  const isPublicRoute = publicRoutes.has(request.nextUrl.pathname);
  const invite = request.nextUrl.searchParams
    .get("invite")
    ?.trim()
    .toUpperCase();
  const hasValidInvite = Boolean(
    invite && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(invite),
  );

  const isActivationReturn =
    request.nextUrl.pathname === "/activate" &&
    request.nextUrl.searchParams.has("code");
  const isAuthCallback = request.nextUrl.pathname === "/auth/callback";

  if (claims && request.nextUrl.pathname === "/login" && hasValidInvite) {
    return redirectWithCookies(request, `/activate?code=${invite}`, response);
  }

  if (claims && isPublicRoute && !isActivationReturn && !isAuthCallback) {
    return redirectWithCookies(request, "/", response);
  }

  if (!claims && !isPublicRoute) {
    return redirectWithCookies(request, "/login", response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};
