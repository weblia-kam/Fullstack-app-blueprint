import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS from "openapi-typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const distDir = path.join(packageDir, "dist");
const sdkDir = path.join(distDir, "sdk");
const specPath = path.join(packageDir, "openapi.v1.json");
const packageJsonPath = path.join(packageDir, "package.json");

await mkdir(distDir, { recursive: true });
await mkdir(sdkDir, { recursive: true });

const raw = await readFile(specPath, "utf-8");
const hash = createHash("sha256").update(raw).digest("hex");

const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
const packageJson = JSON.parse(packageJsonRaw);
const previousHash = packageJson.contractHash ?? "";
let bumped = false;

if (previousHash !== hash) {
  packageJson.version = bumpPatch(packageJson.version ?? "1.0.0");
  packageJson.contractHash = hash;
  bumped = true;
}

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
await writeFile(path.join(distDir, "openapi.v1.json"), raw);

const spec = JSON.parse(raw);
const typesContent = await openapiTS(spec, { additionalProperties: false });
await writeFile(path.join(distDir, "types.d.ts"), typesContent);
await writeFile(path.join(distDir, "types.ts"), typesContent);

const sdkIndexJs = `import createClient from "openapi-fetch";

const FALLBACK_BASE_URL = typeof process !== "undefined" && process.env.API_BASE_URL ? process.env.API_BASE_URL : "";

export function createSdkClient(options = {}) {
  const baseUrl = options.baseUrl ?? FALLBACK_BASE_URL;
  const fetchImpl = options.fetch ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined);
  if (!fetchImpl) {
    throw new Error("contracts: fetch implementation required for SDK client");
  }
  return createClient({ baseUrl, fetch: fetchImpl });
}

export default createSdkClient;
`;

const sdkIndexDts = `import type { Client, FetchAPI } from "openapi-fetch";
import type { paths } from "../types";

declare interface InternalOptions {
  baseUrl?: string;
  fetch?: FetchAPI;
}

export interface SdkClientOptions extends InternalOptions {}

export type BlueprintSdkClient = Client<paths>;

export declare function createSdkClient(options?: SdkClientOptions): BlueprintSdkClient;

export default createSdkClient;

export type { paths } from "../types";
`;

await writeFile(path.join(sdkDir, "index.js"), sdkIndexJs);
await writeFile(path.join(sdkDir, "index.d.ts"), sdkIndexDts);

if (bumped) {
  console.log(`contracts: OpenAPI hash changed → version bumped to ${packageJson.version}`);
} else {
  console.log("contracts: OpenAPI hash unchanged – version preserved");
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(version);
  if (!match) {
    throw new Error(`contracts: unable to bump version '${version}'`);
  }
  const [, major, minor, patch, suffix] = match;
  const nextPatch = Number.parseInt(patch, 10) + 1;
  return `${major}.${minor}.${nextPatch}${suffix ?? ""}`;
}
