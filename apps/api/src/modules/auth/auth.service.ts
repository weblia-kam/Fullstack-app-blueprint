import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { signAccess, signRefresh, verifyToken } from "./jwt.util";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async requestMagicLink(email: string) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = await argon2.hash(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.magicLink.create({ data: { email, tokenHash, expiresAt } });
    // I dev: return token så man kan teste uten e-post. I prod: send via SMTP.
    return { token }; 
  }

  async verifyMagicLink(email: string, token: string) {
    const ml = await this.prisma.magicLink.findFirst({ where: { email, usedAt: null }, orderBy: { createdAt: "desc" } });
    if (!ml || ml.expiresAt < new Date() || !(await argon2.verify(ml.tokenHash, token))) {
      throw new UnauthorizedException("Invalid or expired magic link");
    }
    await this.prisma.magicLink.update({ where: { id: ml.id }, data: { usedAt: new Date() } });

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) user = await this.prisma.user.create({ data: { email } });

    // Opprett ny session (JTI) og tokens
    const jti = uuidv4();
    const refreshToken = signRefresh(user.id, jti);
    const accessToken = signAccess(user.id);

    // Lagre session for rotasjon/blacklist
    const rtExp = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600) * 1000));
    await this.prisma.session.create({ data: { userId: user.id, refreshJti: jti, expiresAt: rtExp } });

    return { userId: user.id, accessToken, refreshToken };
  }

  async refresh(oldRefresh: string) {
    const payload = verifyToken(oldRefresh); // kaster ved ugyldig/utløpt
    if (!payload.sub || !payload.jti) throw new UnauthorizedException("Malformed token");

    // Sørg for at JTI finnes og ikke er revokert/utløpt
    const sess = await this.prisma.session.findUnique({ where: { refreshJti: payload.jti } });
    if (!sess || sess.revokedAt || sess.expiresAt < new Date()) {
      throw new UnauthorizedException("Session revoked/expired");
    }

    // Roter: revoker gammel, opprett ny JTI + tokens
    await this.prisma.session.update({ where: { refreshJti: payload.jti }, data: { revokedAt: new Date() } });
    const newJti = uuidv4();
    const refreshToken = signRefresh(payload.sub, newJti);
    const accessToken = signAccess(payload.sub);
    const rtExp = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_TTL_SEC ?? 1209600) * 1000));
    await this.prisma.session.create({ data: { userId: payload.sub, refreshJti: newJti, expiresAt: rtExp } });

    return { accessToken, refreshToken };
  }

  async logout(refreshOrCookie: string | null) {
    if (!refreshOrCookie) return;
    try {
      const p = verifyToken(refreshOrCookie);
      if (p.jti) await this.prisma.session.update({ where: { refreshJti: p.jti }, data: { revokedAt: new Date() } });
    } catch { /* ignore */ }
  }
}
