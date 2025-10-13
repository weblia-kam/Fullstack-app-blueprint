import { Global, Module } from "@nestjs/common";
import pino, { type Logger, type LoggerOptions } from "pino";
import pinoHttp, { type Options as PinoHttpOptions } from "pino-http";
import { randomUUID } from "node:crypto";

export const LOGGER_TOKEN = Symbol("LOGGER_TOKEN");
export const HTTP_LOGGER_TOKEN = Symbol("HTTP_LOGGER_TOKEN");

const REDACT_FIELDS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
  "password",
  "token",
  "refreshToken"
];

const MAX_BODY_LENGTH = 1024;

function sanitizeBody(body: unknown): unknown {
  if (body == null) {
    return body;
  }

  try {
    const json = typeof body === "string" ? body : JSON.stringify(body);
    if (json && json.length > MAX_BODY_LENGTH) {
      return "[Truncated]";
    }
  } catch (error) {
    return "[Unserializable body]";
  }

  return body;
}

function createLoggerOptions(): LoggerOptions {
  const level = process.env.LOG_LEVEL ?? "info";
  const isDevelopment = process.env.NODE_ENV !== "production";

  const baseOptions: LoggerOptions = {
    level,
    redact: REDACT_FIELDS,
    serializers: {
      req(req) {
        return {
          id: (req as { id?: string }).id,
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
          body: sanitizeBody((req as { body?: unknown }).body)
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
          headers: res.getHeaders ? res.getHeaders() : undefined,
          body: sanitizeBody((res as unknown as { body?: unknown }).body)
        };
      }
    }
  };

  if (isDevelopment) {
    return {
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false
        }
      }
    } satisfies LoggerOptions;
  }

  return baseOptions;
}

function createHttpLoggerOptions(logger: Logger): PinoHttpOptions {
  return {
    logger,
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) {
        return "error";
      }
      if (res.statusCode >= 400) {
        return "warn";
      }
      return "info";
    },
    autoLogging: {
      ignore: (req) => typeof req.url === "string" && req.url.startsWith("/metrics")
    },
    genReqId(req, res) {
      const existing = req.headers["x-request-id"];
      const id = Array.isArray(existing) ? existing[0] : existing;
      const requestId = id || randomUUID();
      if (res && typeof res.setHeader === "function") {
        res.setHeader("x-request-id", requestId);
      }
      (req as { id?: string }).id = requestId;
      return requestId;
    },
    customProps(req, res) {
      return {
        requestId: (req as { id?: string }).id,
        userId: (req as { user?: { id?: string } }).user?.id,
        route: (req as { route?: { path?: string } }).route?.path,
        statusCode: res.statusCode
      };
    }
  } satisfies PinoHttpOptions;
}

@Global()
@Module({
  providers: [
    {
      provide: LOGGER_TOKEN,
      useFactory: () => pino(createLoggerOptions())
    },
    {
      provide: HTTP_LOGGER_TOKEN,
      inject: [LOGGER_TOKEN],
      useFactory: (logger: Logger) => pinoHttp(createHttpLoggerOptions(logger))
    }
  ],
  exports: [LOGGER_TOKEN, HTTP_LOGGER_TOKEN]
})
export class LoggerModule {}
