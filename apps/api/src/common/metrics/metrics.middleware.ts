import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import type { Counter, Histogram } from "prom-client";
import { HTTP_REQUEST_COUNTER, HTTP_REQUEST_DURATION } from "./metrics.module";

function resolveRoute(req: Request): string {
  const route = (req as Request & { route?: { path?: string } }).route?.path;
  if (route) {
    return route;
  }
  if (req.baseUrl) {
    return `${req.baseUrl}${req.path}`;
  }
  return req.path || req.url || "unknown";
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric(HTTP_REQUEST_COUNTER) private readonly httpRequestCounter: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION) private readonly httpRequestDuration: Histogram<string>
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path?.startsWith("/metrics")) {
      return next();
    }

    const end = this.httpRequestDuration.startTimer();

    let recorded = false;

    const record = () => {
      if (recorded) {
        return;
      }
      recorded = true;
      const labels = {
        method: req.method,
        route: resolveRoute(req),
        status: String(res.statusCode)
      };
      this.httpRequestCounter.inc(labels);
      end(labels);
    };

    res.on("finish", record);
    res.on("close", record);

    next();
  }
}
