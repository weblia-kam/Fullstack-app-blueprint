import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { validateSecurityConfig } from "./config/security.config";
import type { Request, Response, NextFunction } from "express";
import { createCsrfMiddleware } from "./middleware/csrf.middleware";
import { DomainErrorInterceptor } from "./common/interceptors/domain-error.interceptor";

const defaultCorsOrigins = ["http://localhost:3000", "https://app.example.com"];

function parseCorsOrigins(): string[] {
  return process.env.API_CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

function configureCors(app: INestApplication) {
  const whitelist = parseCorsOrigins();
  const allowedOrigins = whitelist.length > 0 ? whitelist : defaultCorsOrigins;
  const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
  const allowedHeaders = "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-csrf-token";

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    if (!origin) {
      if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", allowedMethods);
        res.header("Access-Control-Allow-Headers", allowedHeaders);
        return res.sendStatus(200);
      }
      return next();
    }

    if (!allowedOrigins.includes(origin)) {
      if (req.method === "OPTIONS") {
        return res.sendStatus(403);
      }
      return res.status(403).json({ message: "Origin not allowed" });
    }

    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", allowedMethods);
    res.header("Access-Control-Allow-Headers", allowedHeaders);

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    return next();
  });
}

const API_PREFIX = "api/v1";

async function emitOpenApiDocument(app: INestApplication) {
  const { SwaggerModule, DocumentBuilder } = await import("@nestjs/swagger");
  const config = new DocumentBuilder()
    .setTitle("Blueprint API")
    .setVersion("1.0.0")
    .addServer(`/api/v1`)
    .addCookieAuth("sid", { type: "apiKey", in: "cookie" })
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config, { deepScanRoutes: true });
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const outputDir = "packages/contracts";
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(`${outputDir}/openapi.v1.json`, JSON.stringify(doc, null, 2));
  return doc;
}

async function bootstrap() {
  validateSecurityConfig();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX, { exclude: [] });

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.url === "/v1" || req.url.startsWith("/v1/")) {
      return next();
    }
    return res.status(410).json({ error: "API version required. Use /api/v1" });
  });

  configureCors(app);

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

  // CSRF (må ligge etter cookie-parser)
  app.use(createCsrfMiddleware());

  // Rate limiting (streng på /auth/*, moderat globalt)
  app.use(
    `/${API_PREFIX}/auth`,
    rateLimit({ windowMs: 10 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false })
  );
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));

  // Input-validering (whitelist + transform)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Domenefeil → HTTP-svar
  app.useGlobalInterceptors(new DomainErrorInterceptor());

  const shouldEmitOpenApi = process.env.NODE_ENV !== "production" || process.env.EMIT_OPENAPI === "1";
  if (shouldEmitOpenApi) {
    await emitOpenApiDocument(app);
    if (process.env.EMIT_OPENAPI === "1") {
      process.exit(0);
    }
  }

  await app.listen(process.env.PORT ?? 4000);
  // eslint-disable-next-line no-console
  console.log(`API at http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
