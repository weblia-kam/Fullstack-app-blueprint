import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  ping() {
    return { ok: true, service: "api", version: process.env.API_VERSION ?? "0.1.0" };
  }
}
