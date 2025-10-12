import type { Request, Response, NextFunction, RequestHandler } from "express";
import csurf from "csurf";

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

const csrfProtection: RequestHandler = csurf({
  cookie: {
    key: "csrf-secret",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  value(req) {
    return (req.headers["x-csrf-token"] as string | undefined) ?? undefined;
  }
});

export function createCsrfMiddleware(): RequestHandler {
  const csrfCookieName = process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN";

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
            secure: process.env.NODE_ENV === "production",
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined
          });
        }
      }

      return next();
    });
  };
}
