import { NextRequest, NextResponse } from "next/server";

const COOKIE = "la_session";
const PUBLIC = ["/login", "/api/auth/login", "/api/run/daily", "/favicon.ico"];

function verifyEdge(token?: string | null) {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  // lightweight edge check: payload must be valid and unexpired; full HMAC verified in server auth
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return !!data.exp && Date.now() < Number(data.exp) && !!data.id;
  } catch { return false; }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) || pathname.startsWith("/_next") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }
  const ok = verifyEdge(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\.png$|.*\.svg$).*)"] };
