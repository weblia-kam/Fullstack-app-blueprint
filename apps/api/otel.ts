import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import type { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces"
});

const httpInstrumentationConfig: HttpInstrumentationConfig = {
  ignoreIncomingRequestHook: (request) => typeof request.url === "string" && request.url.startsWith("/metrics"),
  requestHook: (span, request) => {
    if ("headers" in request) {
      const header = request.headers?.["x-request-id"] as string | string[] | undefined;
      const requestId = Array.isArray(header) ? header[0] : header;
      if (requestId) {
        span.setAttribute("request_id", requestId);
      }
    }
  }
};

export const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": httpInstrumentationConfig
    })
  ],
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "api",
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE || "blueprint",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || "0.0.0"
  })
});

export async function startOtel(): Promise<void> {
  await sdk.start();
}

export async function shutdownOtel(): Promise<void> {
  await sdk.shutdown();
}
