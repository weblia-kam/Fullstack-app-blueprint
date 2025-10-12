import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { JwtUtil } from "../auth/jwt.util";
@Module({ providers: [UsersService, JwtUtil], controllers: [UsersController], exports: [UsersService] })
export class UsersModule {}
