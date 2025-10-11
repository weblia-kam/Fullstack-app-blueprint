import { NextResponse, type NextRequest } from "next/server";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'"
].join("; ");
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  return res;
}
