import { DomainError } from "../common/domain-error.js";

export type TokenPayload = {
  subject: string;
  tokenId?: string;
};

export interface TokensProvider {
  signAccessToken(userId: string): Promise<string> | string;
  signRefreshToken(userId: string, tokenId: string): Promise<string> | string;
  verifyToken(token: string): Promise<TokenPayload> | TokenPayload;
}

export interface TokensPolicy {
  canIssueTokensForUser(userId: string): Promise<boolean> | boolean;
}

export class TokensService {
  constructor(private readonly provider: TokensProvider, private readonly policy?: TokensPolicy) {}

  async issueAccessToken(userId: string): Promise<string> {
    await this.ensurePolicy(userId);
    return this.provider.signAccessToken(userId);
  }

  async issueRefreshToken(userId: string, tokenId: string): Promise<string> {
    await this.ensurePolicy(userId);
    return this.provider.signRefreshToken(userId, tokenId);
  }

  async verify(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.provider.verifyToken(token);
      if (!payload.subject) {
        throw new DomainError("INVALID_TOKEN", "Token subject missing");
      }
      return payload;
    } catch (error) {
      if (error instanceof DomainError && error.code === "INVALID_TOKEN") {
        throw error;
      }
      throw new DomainError("INVALID_TOKEN", "Token is invalid or expired");
    }
  }

  private async ensurePolicy(userId: string) {
    if (!this.policy) return;
    const allowed = await this.policy.canIssueTokensForUser(userId);
    if (!allowed) {
      throw new DomainError("TOKEN_ISSUANCE_FORBIDDEN", "Token issuance blocked by policy", { userId });
    }
  }
}
