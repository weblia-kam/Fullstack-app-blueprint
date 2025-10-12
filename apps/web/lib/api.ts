import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "XSRF-TOKEN";
const STATEFUL_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function ensureAbsoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

export function parseCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<string | null>((acc, part) => {
      if (acc) {
        return acc;
      }
      const [key, ...rest] = part.split("=");
      if (decodeURIComponent(key) === name) {
        return decodeURIComponent(rest.join("="));
      }
      return null;
    }, null);
}

export function readBrowserCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  return parseCookieValue(document.cookie, CSRF_COOKIE_NAME);
}

export function resolveApiUrl(path: string): string {
  return ensureAbsoluteUrl(path);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = ensureAbsoluteUrl(path);
  const requestInit: RequestInit = { ...init };
  requestInit.credentials = init.credentials ?? "include";

  const method = (requestInit.method ?? "GET").toString().toUpperCase();
  const headers = new Headers(init.headers ?? undefined);

  if (STATEFUL_METHODS.has(method)) {
    const token = readBrowserCsrfToken();
    if (token) {
      headers.set("x-csrf-token", token);
    }
  }

  requestInit.headers = headers;

  return fetch(url, requestInit);
}

export function getCsrfTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  return parseCookieValue(cookieHeader, CSRF_COOKIE_NAME);
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export type CsrfHook = {
  token: string | null;
  refresh: () => Promise<void>;
};

export function createHealthProbeUrl(): string {
  return resolveApiUrl("/health");
}

export function canUseDom(): boolean {
  return typeof window !== "undefined";
}

export function useCsrfToken(): CsrfHook {
  const [token, setToken] = useState<string | null>(() => readBrowserCsrfToken());

  const readToken = useCallback(() => {
    const nextToken = readBrowserCsrfToken();
    setToken(nextToken);
    return nextToken;
  }, []);

  const refresh = useCallback(async () => {
    if (!canUseDom()) {
      setToken(null);
      return;
    }
    try {
      await fetch(createHealthProbeUrl(), { credentials: "include" });
    } catch (error) {
      // Ignore network errors – token read happens regardless
    } finally {
      readToken();
    }
  }, [readToken]);

  useEffect(() => {
    if (canUseDom()) {
      void refresh();
    }
  }, [refresh]);

  return { token, refresh };
}
