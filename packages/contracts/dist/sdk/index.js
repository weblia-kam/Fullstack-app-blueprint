import createClient from "openapi-fetch";

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
