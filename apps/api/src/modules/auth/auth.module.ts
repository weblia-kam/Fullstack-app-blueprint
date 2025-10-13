import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MailerModule } from "../mailer/mailer.module";
import { JwtUtil } from "./jwt.util";
import { JwtTokensProvider } from "./jwt.tokens.provider";
import { TokensService } from "@org/domain";

@Module({
  imports: [MailerModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtUtil,
    JwtTokensProvider,
    {
      provide: TokensService,
      useFactory: (provider: JwtTokensProvider) => new TokensService(provider),
      inject: [JwtTokensProvider],
    },
  ],
  exports: [TokensService],
})
export class AuthModule {}
