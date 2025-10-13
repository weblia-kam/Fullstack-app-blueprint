import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const specPath = path.join(packageDir, "openapi.v1.json");

const raw = await readFile(specPath, "utf-8");
let spec;
try {
  spec = JSON.parse(raw);
} catch (error) {
  console.error("contracts: failed to parse openapi.v1.json");
  throw error;
}

if (typeof spec.openapi !== "string" || !spec.openapi.startsWith("3.0.")) {
  throw new Error(`contracts: expected OpenAPI 3.0.x document, received ${spec.openapi ?? "unknown"}`);
}

const paths = spec.paths ?? {};
for (const key of Object.keys(paths)) {
  if (!key.startsWith("/api/v1")) {
    throw new Error(`contracts: invalid path '${key}' – all endpoints must be under /api/v1`);
  }
}

const bannedPatterns = [/devtoken/i, /debug/i];
for (const pattern of bannedPatterns) {
  if (pattern.test(raw)) {
    throw new Error(`contracts: detected disallowed field matching ${pattern} in OpenAPI document`);
  }
}

console.log("contracts: OpenAPI document validated successfully");
