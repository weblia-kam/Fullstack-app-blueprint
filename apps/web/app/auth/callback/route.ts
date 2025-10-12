import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  if (!email || !token) return NextResponse.redirect(new URL("/login", url.origin));

  // POST til API for å verifisere og sette cookies (API setter HttpOnly cookies)
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const r = await fetch(`${api}/auth/verify-magic-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token }),
    redirect: "manual"
  });

  if (!r.ok) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // Kopier Set-Cookie fra API til web-domenet (proxy)
  const setCookie = r.headers.get("set-cookie") || "";
  const res = NextResponse.redirect(new URL("/profile", url.origin));
  // Del opp evt. flere cookies
  setCookie.split(/,(?=[^;,]+=)/).forEach((c) => {
    const part = c.split(";")[0];
    const [name, value] = part.split("=");
    if (name && value) {
      res.cookies.set(name, value, { httpOnly: true, sameSite: "lax", path: "/" });
    }
  });
  return res;
}
