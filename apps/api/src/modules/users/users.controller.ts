import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { TokensService, UsersService as UsersDomainService } from "@org/domain";

@ApiTags("me")
@Controller("me")
export class UsersController {
  constructor(
    private readonly usersService: UsersDomainService,
    private readonly tokens: TokensService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiCookieAuth()
  async me(@Req() req: Request) {
    const access =
      (req.cookies?.access as string) || (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!access) throw new UnauthorizedException("Missing token");

    const payload = await this.tokens.verify(access);
    const user = await this.usersService.getProfile(payload.subject);

    const safeUser = {
      id: user.id,
      email: user.email,
      phone: user.profile?.phone ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      birthDate: user.profile?.birthDate ?? null,
      displayName: user.profile?.displayName ?? user.name ?? undefined,
      createdAt: user.createdAt,
      role: user.role,
    };

    return { user: safeUser };
  }
}
