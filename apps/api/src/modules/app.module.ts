import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";

@Module({ imports: [PrismaModule, UsersModule, AuthModule, HealthModule] })
export class AppModule {}
