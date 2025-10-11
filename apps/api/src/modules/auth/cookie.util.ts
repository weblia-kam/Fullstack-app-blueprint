import { Response } from "express";
const isProd = process.env.NODE_ENV === "production";
export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  // access cookie (kort TTL)
  res.cookie("access", tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900) * 1000,
    path: "/"
  });
  // refresh cookie (lengre TTL)
  res.cookie("sid", tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600) * 1000,
    path: "/"
  });
}
export function clearAuthCookies(res: Response) {
  res.clearCookie("access", { path: "/" });
  res.clearCookie("sid", { path: "/" });
}
