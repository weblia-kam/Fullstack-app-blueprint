import jwt from "jsonwebtoken";

const accessTtlSec = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900);
const refreshTtlSec = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600);
const iss = process.env.JWT_ISS ?? "blueprint";
const aud = process.env.JWT_AUD ?? "blueprint-web";
const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";

type JwtPayload = { sub: string; jti?: string; };

export function signAccess(sub: string) {
  return jwt.sign({ sub } as JwtPayload, secret, { algorithm: "HS256", expiresIn: accessTtlSec, issuer: iss, audience: aud });
}
export function signRefresh(sub: string, jti: string) {
  return jwt.sign({ sub, jti } as JwtPayload, secret, { algorithm: "HS256", expiresIn: refreshTtlSec, issuer: iss, audience: aud });
}
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret, { algorithms: ["HS256"], issuer: iss, audience: aud }) as JwtPayload;
}
