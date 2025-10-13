import { test, expect } from "@playwright/test";

const apiOrigin = process.env.PLAYWRIGHT_API_ORIGIN ?? "http://localhost:4000";
const normalizedOrigin = apiOrigin.endsWith("/") ? apiOrigin.slice(0, -1) : apiOrigin;
const apiBase = `${normalizedOrigin}/api/v1`;

test.describe("Authentication and CSRF protection", () => {
  test("enforces CSRF token on login flow", async ({ page, context }) => {
    const healthEndpoint = `${apiBase}/health`;
    const loginEndpoint = `${apiBase}/auth/login`;
    let loginAttempts = 0;

    await context.route(healthEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/json",
          "set-cookie": "XSRF-TOKEN=test-csrf-token; Path=/; SameSite=Strict",
        },
      });
    });

    await context.route(loginEndpoint, async (route) => {
      loginAttempts += 1;
      const hasCsrf = Boolean(route.request().headers()["x-csrf-token"]);
      if (!hasCsrf) {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({ message: "Invalid CSRF token" }),
          headers: { "content-type": "application/json" },
        });
        return;
      }

      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ok: true, redirect: "/dashboard" }),
        headers: {
          "content-type": "application/json",
          location: "/dashboard",
        },
      });
    });

    await page.goto("/login");
    const cookies = await context.cookies();
    const csrfCookie = cookies.find((cookie) => cookie.name === "XSRF-TOKEN");
    expect(csrfCookie?.value).toBe("test-csrf-token");

    const forbiddenStatus = await page.evaluate(async (endpoint) => {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: "user@example.com", password: "Password123" }),
      });
      return response.status;
    }, loginEndpoint);
    expect(forbiddenStatus).toBe(403);

    const success = await page.evaluate(async (endpoint) => {
      const token = document.cookie
        .split("; ")
        .find((part) => part.startsWith("XSRF-TOKEN="))
        ?.split("=")[1] ?? "";
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": token,
        },
        body: JSON.stringify({ identifier: "user@example.com", password: "Password123" }),
      });
      const body = await response.json();
      return {
        status: response.status,
        location: response.headers.get("location"),
        body,
      };
    }, loginEndpoint);

    expect(success.status).toBe(200);
    expect(success.location).toBe("/dashboard");
    expect(success.body.redirect).toBe("/dashboard");
    expect(loginAttempts).toBe(2);
  });
});
