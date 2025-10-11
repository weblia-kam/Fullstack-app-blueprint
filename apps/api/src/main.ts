import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import helmet from "helmet";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: false } });
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  if (process.env.EMIT_OPENAPI === "1") {
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
