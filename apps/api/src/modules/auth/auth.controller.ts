import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
const emailSchema = z.object({ email: z.string().email() });
@Controller("auth")
export class AuthController {
  @Post("request-magic-link")
  async requestMagicLink(@Body() body: unknown) {
    const { email } = emailSchema.parse(body);
    return { ok: true, email };
  }
}
