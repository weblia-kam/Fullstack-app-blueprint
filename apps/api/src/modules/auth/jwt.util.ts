import jwt from "jsonwebtoken";

const accessTtlSec = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 900);
const refreshTtlSec = Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600);
const iss = process.env.JWT_ISS ?? "blueprint";
const aud = process.env.JWT_AUD ?? "blueprint-web";

type JwtPayload = { sub: string; jti?: string };

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured. See README for configuration details.");
  }
  return secret;
}

export function signAccess(sub: string) {
  return jwt.sign({ sub } as JwtPayload, getSecret(), {
    algorithm: "HS256",
    expiresIn: accessTtlSec,
    issuer: iss,
    audience: aud
  });
}

export function signRefresh(sub: string, jti: string) {
  return jwt.sign({ sub, jti } as JwtPayload, getSecret(), {
    algorithm: "HS256",
    expiresIn: refreshTtlSec,
    issuer: iss,
    audience: aud
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
    issuer: iss,
    audience: aud
  }) as JwtPayload;
}
