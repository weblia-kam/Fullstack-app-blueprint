import { Global, Module } from "@nestjs/common";
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";
import type { DefaultMetricsCollectorConfiguration, RegistryContentType } from "prom-client";
import { MetricsMiddleware } from "./metrics.middleware";
import { MetricsGuard } from "./metrics.guard";
import { HTTP_REQUEST_COUNTER, HTTP_REQUEST_DURATION } from "./metrics.constants";

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: { timeout: 5000 } as unknown as DefaultMetricsCollectorConfiguration<RegistryContentType>
      },
      path: "/metrics"
    })
  ],
  providers: [
    makeCounterProvider({
      name: HTTP_REQUEST_COUNTER,
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"]
    }),
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }),
    MetricsMiddleware,
    MetricsGuard
  ],
  exports: [PrometheusModule, HTTP_REQUEST_COUNTER, HTTP_REQUEST_DURATION, MetricsMiddleware, MetricsGuard]
})
export class MetricsModule {}
