import { Injectable } from "@nestjs/common";
import type { TokenPayload, TokensProvider } from "@org/domain";
import { JwtUtil } from "./jwt.util";

@Injectable()
export class JwtTokensProvider implements TokensProvider {
  constructor(private readonly jwt: JwtUtil) {}

  signAccessToken(userId: string): string {
    return this.jwt.signAccess(userId);
  }

  signRefreshToken(userId: string, tokenId: string): string {
    return this.jwt.signRefresh(userId, tokenId);
  }

  verifyToken(token: string): TokenPayload {
    const payload = this.jwt.verifyToken(token);
    return { subject: payload.sub, tokenId: payload.jti };
  }
}
