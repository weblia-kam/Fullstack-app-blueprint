import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { verifyToken } from "../auth/jwt.util";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("me")
@Controller("me")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiBearerAuth()
  @ApiCookieAuth()
  async me(@Req() req: Request) {
    const access = (req.cookies?.access as string) || (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!access) throw new UnauthorizedException("Missing token");
    const payload = verifyToken(access); // kaster hvis ugyldig/utløpt
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    return { user };
  }
}
