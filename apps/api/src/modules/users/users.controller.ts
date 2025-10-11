import { Controller, Get } from "@nestjs/common";
@Controller("me")
export class UsersController {
  @Get() me() { return { ok: true, user: null }; }
}
