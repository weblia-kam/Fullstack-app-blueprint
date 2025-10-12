import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { MailerModule } from "./mailer/mailer.module";

@Module({ imports: [PrismaModule, UsersModule, AuthModule, HealthModule, MailerModule] })
export class AppModule {}
