import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const src = readFileSync("apps/api/openapi/openapi.json", "utf-8");
const json = JSON.parse(src);
json.info = json.info || {};
json.info.version = process.env.API_VERSION || json.info.version || "0.1.0";
mkdirSync("packages/contracts/dist", { recursive: true });
writeFileSync("packages/contracts/dist/openapi.json", JSON.stringify(json, null, 2));
console.log("contracts: synced → packages/contracts/dist/openapi.json");
