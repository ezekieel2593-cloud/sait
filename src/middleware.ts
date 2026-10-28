import { NextResponse, type NextRequest } from "next/server";

// имя cookie синхронизировано с SESSION_COOKIE в src/lib/auth.ts (edge-рантайм не может импортировать node:crypto)
const SESSION_COOKIE = "astra_session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/specialist/login" || pathname.startsWith("/specialist/login")) {
    const response = NextResponse.next();
    applyHeaders(response, false);
    return response;
  }

  if (pathname === "/specialist" || pathname.startsWith("/specialist/")) {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/specialist/login";
      url.search = "";
      if (pathname !== "/specialist") url.searchParams.set("next", `${pathname}${search}`);
      const redirect = NextResponse.redirect(url);
      applyHeaders(redirect, true);
      return redirect;
    }
    const response = NextResponse.next();
    applyHeaders(response, true);
    return response;
  }

  const response = NextResponse.next();
  applyHeaders(response, false);
  return response;
}

function applyHeaders(response: NextResponse, privateRoute: boolean) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (privateRoute) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
