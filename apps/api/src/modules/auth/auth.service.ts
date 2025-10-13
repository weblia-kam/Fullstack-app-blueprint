import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { MailerService } from "../mailer/mailer.service";
import { JwtUtil } from "./jwt.util";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly jwt: JwtUtil,
    private readonly config: ConfigService
  ) {
    this.refreshTtlMs = Number(this.config.get("REFRESH_TOKEN_TTL_SEC") ?? 1209600) * 1000;
  }

  private async issueForUser(userId: string) {
    const jti = uuidv4();
    const refreshToken = this.jwt.signRefresh(userId, jti);
    const accessToken = this.jwt.signAccess(userId);
    const rtExp = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.session.create({ data: { userId, token: jti, expiresAt: rtExp } });
    return { accessToken, refreshToken };
  }

  async requestMagicLink(email: string) {
    const token = randomBytes(32).toString("hex");
    const tokenDigest = await argon2.hash(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.magicLink.create({ data: { email, token: tokenDigest, expiresAt } });

    // Bygg callback-URL inn i web-klienten
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const callback = new URL("/auth/callback", appUrl);
    callback.searchParams.set("email", email);
    callback.searchParams.set("token", token);

    // Send e-post (til MailHog i dev)
    await this.mailer.sendMagicLink(email, callback.toString());

    // Dev-kvalitet: returner token også (enkelt å teste via API)
    return { token };
  }

  async verifyMagicLink(email: string, token: string) {
    const ml = await this.prisma.magicLink.findFirst({ where: { email, usedAt: null }, orderBy: { createdAt: "desc" } });
    if (!ml || ml.expiresAt < new Date() || !(await argon2.verify(ml.token, token))) {
      throw new UnauthorizedException("Invalid or expired magic link");
    }
    await this.prisma.magicLink.update({ where: { id: ml.id }, data: { usedAt: new Date() } });

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) user = await this.prisma.user.create({ data: { email } });

    const tokens = await this.issueForUser(user.id);

    return { userId: user.id, ...tokens };
  }

  async refresh(oldRefresh: string) {
    const payload = this.jwt.verifyToken(oldRefresh); // kaster ved ugyldig/utløpt
    if (!payload.sub || !payload.jti) throw new UnauthorizedException("Malformed token");

    // Sørg for at JTI finnes og ikke er revokert/utløpt
    const sess = await this.prisma.session.findUnique({ where: { token: payload.jti } });
    if (!sess || sess.revokedAt || sess.expiresAt < new Date()) {
      throw new UnauthorizedException("Session revoked/expired");
    }

    // Roter: revoker gammel, opprett ny JTI + tokens
    await this.prisma.session.update({ where: { token: payload.jti }, data: { revokedAt: new Date() } });
    const newJti = uuidv4();
    const refreshToken = this.jwt.signRefresh(payload.sub, newJti);
    const accessToken = this.jwt.signAccess(payload.sub);
    const rtExp = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.session.create({ data: { userId: payload.sub, token: newJti, expiresAt: rtExp } });

    return { accessToken, refreshToken };
  }

  async logout(refreshOrCookie: string | null) {
    if (!refreshOrCookie) return;
    try {
      const p = this.jwt.verifyToken(refreshOrCookie);
      if (p.jti) await this.prisma.session.update({ where: { token: p.jti }, data: { revokedAt: new Date() } });
    } catch { /* ignore */ }
  }

  async registerUser(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    birthDate?: string | null;
    password: string;
    acceptedTerms: boolean;
  }) {
    const { firstName, lastName, email, phone, birthDate, password, acceptedTerms } = input;

    if (!acceptedTerms) throw new BadRequestException("Terms must be accepted");

    // Enkel e-post- og passord-policy (kan strammes senere)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Invalid email");
    if (password.length < 8 || password.length > 128) throw new BadRequestException("Invalid password length");

    // Telefon (valgfri) – enkel normalisering, fjern mellomrom
    let normalizedPhone: string | null = null;
    if (phone && phone.trim()) {
      normalizedPhone = phone.replace(/\s+/g, "");
      // tillat + og sifre; enkel sjekk (E.164-lignende)
      if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
        throw new BadRequestException("Invalid phone");
      }
    }

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])] }
    });
    if (exists) throw new BadRequestException("User already exists");

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: normalizedPhone,
        firstName,
        lastName,
        birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null,
        passwordHash,
        acceptedTerms: true,
        displayName: `${firstName} ${lastName}`.trim()
      }
    });

    return this.issueForUser(user.id);
  }

  async login(identifier: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }]
      }
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException("Invalid credentials");
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueForUser(user.id);
  }
}
