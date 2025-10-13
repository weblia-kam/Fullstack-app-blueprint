import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { TokensService, UsersService as UsersDomainService } from "@org/domain";

class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  birthDate!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  role!: string;
}

class MeResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

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
  @ApiOkResponse({ type: MeResponseDto })
  async me(@Req() req: Request): Promise<MeResponseDto> {
    const access =
      (req.cookies?.access as string) || (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!access) throw new UnauthorizedException("Missing token");

    const payload = await this.tokens.verify(access);
    const user = await this.usersService.getProfile(payload.subject);

    const safeUser: UserProfileDto = {
      id: user.id,
      email: user.email,
      phone: user.profile?.phone ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      birthDate: user.profile?.birthDate
        ? (user.profile.birthDate instanceof Date
            ? user.profile.birthDate.toISOString().slice(0, 10)
            : user.profile.birthDate)
        : null,
      displayName: user.profile?.displayName ?? user.name ?? null,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
      role: user.role,
    };

    return { user: safeUser };
  }
}
