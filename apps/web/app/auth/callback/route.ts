import { NextResponse } from "next/server";

type CookieOptions = {
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  maxAge?: number;
  sameSite?: "lax" | "strict" | "none";
};

type ParsedCookie = { name: string; value: string; options: CookieOptions };

function isSecureRequest(req: Request) {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  const protocol = new URL(req.url).protocol.replace(":", "");
  return protocol === "https";
}

function parseSetCookie(cookieString: string, secureRequest: boolean): ParsedCookie | null {
  const segments = cookieString
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const [nameValue, ...attributeSegments] = segments;
  const equalsIndex = nameValue.indexOf("=");
  if (equalsIndex <= 0) return null;

  const name = nameValue.slice(0, equalsIndex).trim();
  const value = nameValue.slice(equalsIndex + 1);
  if (!name) return null;

  const options: CookieOptions = {};
  let secure = false;
  let sameSite: CookieOptions["sameSite"];

  for (const segment of attributeSegments) {
    const [rawKey, ...rawValParts] = segment.split("=");
    const key = rawKey.trim().toLowerCase();
    const val = rawValParts.join("=").trim();

    switch (key) {
      case "httponly":
        options.httpOnly = true;
        break;
      case "secure":
        secure = true;
        options.secure = true;
        break;
      case "path":
        if (val) options.path = val;
        break;
      case "domain":
        if (val) options.domain = val;
        break;
      case "max-age": {
        const maxAge = Number(val);
        if (!Number.isNaN(maxAge)) options.maxAge = maxAge;
        break;
      }
      case "expires": {
        const expires = new Date(val);
        if (!Number.isNaN(expires.getTime())) options.expires = expires;
        break;
      }
      case "samesite": {
        const normalized = val.toLowerCase();
        if (normalized === "lax" || normalized === "strict" || normalized === "none") {
          sameSite = normalized;
        }
        break;
      }
      default:
        break;
    }
  }

  if (sameSite) {
    options.sameSite = sameSite;
    if (sameSite === "none" && !secure) {
      options.secure = true;
      secure = true;
    }
  }

  if (!secure && secureRequest) {
    options.secure = true;
  }

  return { name, value, options };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  if (!email || !token) return NextResponse.redirect(new URL("/login", url.origin));

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

  const headersWithGetSetCookie = r.headers as unknown as { getSetCookie?: () => string[] };
  const rawCookies =
    headersWithGetSetCookie.getSetCookie?.() ??
    (r.headers.get("set-cookie") ? [r.headers.get("set-cookie") as string] : []);

  const cookieStrings = rawCookies
    .flatMap((value) => value.split(/,(?=[^;,]+=)/))
    .map((value) => value.trim())
    .filter(Boolean);

  const res = NextResponse.redirect(new URL("/profile", url.origin));
  const secureRequest = isSecureRequest(req);

  for (const cookieString of cookieStrings) {
    const parsed = parseSetCookie(cookieString, secureRequest);
    if (parsed) {
      res.cookies.set(parsed.name, parsed.value, parsed.options);
    }
  }

  return res;
}
