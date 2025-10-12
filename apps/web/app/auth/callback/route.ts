import { NextResponse } from "next/server";
import { getApiBaseUrl, getCsrfTokenFromCookieHeader } from "../../../lib/api";

function isSecureRequest(req: Request) {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  const protocol = new URL(req.url).protocol.replace(":", "");
  return protocol === "https";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  if (!email || !token) return NextResponse.redirect(new URL("/login", url.origin));

  const api = getApiBaseUrl();
  const headers = new Headers({ "content-type": "application/json" });
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    const csrfToken = getCsrfTokenFromCookieHeader(cookieHeader);
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }
  const r = await fetch(`${api}/auth/verify-magic-link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, token }),
    redirect: "manual",
    credentials: "include"
  });

  if (!r.ok) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const body = await r.json().catch(() => null);
  if (!body || typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const res = NextResponse.redirect(new URL("/profile", url.origin));
  const secureRequest = process.env.NODE_ENV === "production" ? true : isSecureRequest(req);
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const baseOptions = { domain, path: "/" as const, secure: secureRequest };
  const accessMaxAge = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900);
  const refreshMaxAge = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600);

  res.cookies.set("access", body.accessToken, {
    ...baseOptions,
    httpOnly: true,
    sameSite: "lax",
    maxAge: accessMaxAge
  });

  res.cookies.set("sid", body.refreshToken, {
    ...baseOptions,
    httpOnly: true,
    sameSite: "strict",
    maxAge: refreshMaxAge
  });

  return res;
}
