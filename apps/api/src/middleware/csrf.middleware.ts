import type { Request, Response, NextFunction, RequestHandler } from "express";
import csurf from "csurf";
import { ConfigService } from "@nestjs/config";

const MOBILE_PATH_REGEX = /^\/api\/v1\/mobile\//;

function shouldBypassCsrf(req: Request): boolean {
  if (MOBILE_PATH_REGEX.test(req.path)) {
    return true;
  }
  const authorization = req.headers.authorization;
  return typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ");
}

function getCsrfToken(req: Request & { csrfToken?: () => string }): string | undefined {
  if (!req.csrfToken) {
    return undefined;
  }
  try {
    return req.csrfToken();
  } catch (error) {
    return undefined;
  }
}

export function createCsrfMiddleware(config: ConfigService): RequestHandler {
  const isProd = config.get<string>("NODE_ENV") === "production";
  const cookieDomain = config.get<string>("COOKIE_DOMAIN") ?? undefined;
  const csrfCookieName = config.get<string>("CSRF_COOKIE_NAME") ?? "XSRF-TOKEN";
  const csrfProtection = csurf({
    cookie: {
      key: "csrf-secret",
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      domain: cookieDomain
    },
    value(req) {
      return (req.headers["x-csrf-token"] as string | undefined) ?? "";
    }
  }) as unknown as RequestHandler;

  return (req: Request, res: Response, next: NextFunction) => {
    if (shouldBypassCsrf(req)) {
      return next();
    }

    return csrfProtection(req, res, (err?: unknown) => {
      if (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "EBADCSRFTOKEN") {
          return res.status(403).json({ message: "Invalid CSRF token" });
        }
        return next(err);
      }

      if (req.method === "GET") {
        const token = getCsrfToken(req as Request & { csrfToken?: () => string });
        if (token) {
          res.cookie(csrfCookieName, token, {
            httpOnly: false,
            sameSite: "strict",
            secure: isProd,
            path: "/",
            domain: cookieDomain
          });
        }
      }

      return next();
    });
  };
}
