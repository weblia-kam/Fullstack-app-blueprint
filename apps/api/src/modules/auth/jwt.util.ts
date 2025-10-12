import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";

type JwtPayload = { sub: string; jti?: string };

@Injectable()
export class JwtUtil {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.getOrThrow<string>("JWT_SECRET");
    this.issuer = this.config.get<string>("JWT_ISS") ?? "blueprint";
    this.audience = this.config.get<string>("JWT_AUD") ?? "blueprint-web";
    this.accessTtlSec = Number(this.config.get("ACCESS_TOKEN_TTL_SEC") ?? 900);
    this.refreshTtlSec = Number(this.config.get("REFRESH_TOKEN_TTL_SEC") ?? 1209600);
  }

  signAccess(sub: string) {
    const payload: JwtPayload = { sub };
    return jwt.sign(payload, this.secret, {
      algorithm: "HS512",
      expiresIn: this.accessTtlSec,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  signRefresh(sub: string, jti: string) {
    const payload: JwtPayload = { sub, jti };
    return jwt.sign(payload, this.secret, {
      algorithm: "HS512",
      expiresIn: this.refreshTtlSec,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.secret, {
      algorithms: ["HS512"],
      issuer: this.issuer,
      audience: this.audience
    }) as JwtPayload;
  }
}
