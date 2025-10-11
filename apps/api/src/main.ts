import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: false } });

  // HTTP security headers (CSP håndteres av web)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  // Cookies (HttpOnly på svar)
  app.use(cookieParser());

  // Rate limiting (streng på /auth/*, moderat globalt)
  app.use("/auth", rateLimit({ windowMs: 10 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));

  // Input-validering (whitelist + transform)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // OpenAPI emit-modus (brukes av sdk:all)
  if (process.env.EMIT_OPENAPI === "1") {
    const { SwaggerModule, DocumentBuilder } = await import("@nestjs/swagger");
    const cfg = new DocumentBuilder()
      .setTitle("Blueprint API")
      .setVersion(process.env.API_VERSION ?? "0.1.0")
      .addCookieAuth("sid", { type: "apiKey", in: "cookie" })
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("./openapi", { recursive: true });
    writeFileSync("./openapi/openapi.json", JSON.stringify(doc, null, 2));
    process.exit(0);
  }

  await app.listen(process.env.PORT ?? 4000);
  // eslint-disable-next-line no-console
  console.log(`API at http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
