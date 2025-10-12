import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MailerModule } from "../mailer/mailer.module";
import { JwtUtil } from "./jwt.util";

@Module({ imports: [MailerModule], controllers: [AuthController], providers: [AuthService, JwtUtil] })
export class AuthModule {}
