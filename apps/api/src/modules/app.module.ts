import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { MailerModule } from "./mailer/mailer.module";
import { LoggerModule } from "../common/logging/logger.module";
import { MetricsModule } from "../common/metrics/metrics.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    MailerModule
  ]
})
export class AppModule {}
