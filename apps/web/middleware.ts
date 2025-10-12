import { NextResponse, type NextRequest } from "next/server";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiOrigin = new URL(api).origin;
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self'",
  `connect-src 'self' ${apiOrigin}`
].join("; ");
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  return res;
}
