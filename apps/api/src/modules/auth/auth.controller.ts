import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "./cookie.util";
import type { Request, Response } from "express";

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), token: z.string().min(32) });
const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-z0-9_\-.]+$/i),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});
const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8)
});

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("request-magic-link")
  async requestMagicLink(@Body() body: unknown) {
    const { email } = emailSchema.parse(body);
    const { token } = await this.auth.requestMagicLink(email);
    // DEV: Returner token i respons for enkel test (i prod sendes på e-post)
    return { ok: true, devToken: token };
  }

  @Post("verify-magic-link")
  async verifyMagicLink(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, token } = verifySchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.verifyMagicLink(email, token);
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken }; // mobilklient kan bruke disse
  }

  @Post("refresh")
  @ApiBearerAuth()
  @ApiCookieAuth()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || null;
    const fromCookie = (req.cookies?.sid as string) || null;
    const token = bearer || fromCookie;
    const tokens = await this.auth.refresh(token!);
    setAuthCookies(res, tokens);
    return { ok: true, ...tokens };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || null;
    const fromCookie = (req.cookies?.sid as string) || null;
    await this.auth.logout(bearer || fromCookie);
    clearAuthCookies(res);
    return;
  }

  @Post("register")
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { username, email, password } = registerSchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.register(username, email, password);
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken };
  }

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { identifier, password } = loginSchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.login(identifier, password);
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken };
  }
}
