import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
const accessMaxAge = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900) * 1000;
const refreshMaxAge = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600) * 1000;

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const baseOptions = { domain: cookieDomain, path: "/" as const };

  res.cookie("access", tokens.accessToken, {
    ...baseOptions,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: accessMaxAge
  });

  res.cookie("sid", tokens.refreshToken, {
    ...baseOptions,
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: refreshMaxAge
  });
}

export function clearAuthCookies(res: Response) {
  const options = { domain: cookieDomain, path: "/" as const };
  res.clearCookie("access", options);
  res.clearCookie("sid", options);
}
