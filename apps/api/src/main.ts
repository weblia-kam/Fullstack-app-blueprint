import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ValidationPipe } from "@nestjs/common";
import { validateSecurityConfig } from "./config/security.config";
import csurf from "csurf";
import type { RequestHandler } from "express";

const defaultCorsOrigins = ["http://localhost:3000", "https://app.example.com"];

function buildCorsWhitelist() {
  const fromEnv = process.env.API_CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return defaultCorsOrigins;
}

const csrfBypass = [/^\/api\/v1\/mobile/];

function shouldBypassCsrf(pathname: string) {
  return csrfBypass.some((pattern) => pattern.test(pathname));
}

async function bootstrap() {
  validateSecurityConfig();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");

  const whitelist = buildCorsWhitelist();
  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (whitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    }
  });

  // HTTP security headers (CSP håndteres av web)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: { action: "deny" },
      hsts: { includeSubDomains: true, preload: true }
    })
  );
  app.use(helmet.noSniff());

  // Cookies (HttpOnly på svar)
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Rate limiting (streng på /auth/*, moderat globalt)
  app.use(
    "/api/v1/auth",
    rateLimit({ windowMs: 10 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false })
  );
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));

  const csrfProtection = csurf({
    cookie: {
      key: "csrf-secret",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined
    }
  }) as RequestHandler;

  app.use((req, res, next) => {
    if (shouldBypassCsrf(req.path)) {
      return next();
    }
    return csrfProtection(req, res, (err) => {
      if (err) {
        return next(err);
      }
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const token = (req as typeof req & { csrfToken?: () => string }).csrfToken?.();
        if (token) {
          res.cookie("csrf-token", token, {
            httpOnly: false,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined
          });
        }
      }
      return next();
    });
  });

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
    const outputDir = "packages/contracts";
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(`${outputDir}/openapi.v1.json`, JSON.stringify(doc, null, 2));
    process.exit(0);
  }

  app.use(/^\/(auth|users|health)(\/|$)/, (_req: unknown, res: any) => {
    res.status(410).json({ error: "This endpoint has moved to /api/v1" });
  });

  await app.listen(process.env.PORT ?? 4000);
  // eslint-disable-next-line no-console
  console.log(`API at http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
