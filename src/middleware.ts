import { NextRequest, NextResponse } from "next/server";

const INVITE_COOKIE = "p2_pending_invite";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/(join|j)\/([a-zA-Z0-9]{10})$/);

  if (!match) return NextResponse.next();

  const [, routeKind, rawCode] = match;
  const inviteCode = rawCode.toUpperCase();

  const response =
    routeKind === "j"
      ? NextResponse.redirect(new URL(`/join/${inviteCode}`, request.url))
      : NextResponse.next();

  response.cookies.set(INVITE_COOKIE, inviteCode, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: ["/join/:path*", "/j/:path*"],
};
