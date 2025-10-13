import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiHideProperty, ApiOkResponse, ApiProperty, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "./cookie.util";
import type { Request, Response } from "express";

const emailSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), token: z.string().min(32) });
const registerSchema = z.object({
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  email: z.string().email(),
  phone: z.string().min(7).max(20).regex(/^\+?[0-9\s-]+$/).optional().or(z.literal("").transform(() => undefined)),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(8).max(128),
  acceptedTerms: z.boolean().refine(v => v === true, { message: "Terms must be accepted" })
});
const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8)
});

class MagicLinkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiHideProperty()
  devToken?: string;
}

class TokenPairResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("request-magic-link")
  @ApiOkResponse({ type: MagicLinkResponseDto })
  async requestMagicLink(@Body() body: unknown): Promise<MagicLinkResponseDto> {
    const { email } = emailSchema.parse(body);
    const { token } = await this.auth.requestMagicLink(email);
    const response: MagicLinkResponseDto = { ok: true };
    if (process.env.NODE_ENV !== "production") {
      response.devToken = token;
    }
    return response;
  }

  @Post("verify-magic-link")
  @ApiOkResponse({ type: TokenPairResponseDto })
  async verifyMagicLink(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response
  ): Promise<TokenPairResponseDto> {
    const { email, token } = verifySchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.verifyMagicLink(email, token);
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken };
  }

  @Post("refresh")
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOkResponse({ type: TokenPairResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<TokenPairResponseDto> {
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || null;
    const fromCookie = (req.cookies?.sid as string) || null;
    const token = bearer || fromCookie;
    if (!token) throw new UnauthorizedException("Refresh token required");
    const tokens = await this.auth.refresh(token);
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
  @ApiOkResponse({ type: TokenPairResponseDto })
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response
  ): Promise<TokenPairResponseDto> {
    const data = registerSchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: (data.phone ?? undefined),
      birthDate: (data.birthDate ?? undefined),
      password: data.password,
      acceptedTerms: data.acceptedTerms
    });
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken };
  }

  @Post("login")
  @ApiOkResponse({ type: TokenPairResponseDto })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response
  ): Promise<TokenPairResponseDto> {
    const { identifier, password } = loginSchema.parse(body);
    const { accessToken, refreshToken } = await this.auth.login(identifier, password);
    setAuthCookies(res, { accessToken, refreshToken });
    return { ok: true, accessToken, refreshToken };
  }
}
