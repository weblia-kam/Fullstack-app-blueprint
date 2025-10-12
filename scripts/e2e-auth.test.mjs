/* Minimal E2E: magic-link → verify → /me → refresh → logout */
const base = process.env.API_URL || "http://localhost:4000";
const email = "test@example.com";

function must(cond, msg) { if (!cond) throw new Error(msg); }

async function json(url, opts={}) {
  const r = await fetch(url, { headers: { "content-type": "application/json", ...(opts.headers||{}) }, ...opts });
  const body = await r.json().catch(()=> ({}));
  return { status: r.status, headers: r.headers, body };
}

(async () => {
  // request magic link
  const req = await json(`${base}/auth/request-magic-link`, { method: "POST", body: JSON.stringify({ email }) });
  must(req.status === 201 || req.status === 200, "request-magic-link failed");
  const token = req.body.devToken; must(token && token.length > 10, "no devToken returned");

  // verify magic link (capture cookies)
  const ver = await fetch(`${base}/auth/verify-magic-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token }),
    redirect: "manual"
  });
  const setCookie = ver.headers.get("set-cookie") || "";
  const data = await ver.json();
  must(ver.status === 201 || ver.status === 200, "verify failed");
  must(data.accessToken && data.refreshToken, "missing tokens");
  must(setCookie.includes("sid=") && setCookie.includes("access="), "missing auth cookies");

  // call /me with cookie
  const me = await fetch(`${base}/me`, { headers: { cookie: setCookie.split(",").map(s=>s.split(";")[0]).join("; ") } });
  const meBody = await me.json();
  must(me.status === 200 && meBody.user, "/me with cookie failed");

  // call refresh using cookie
  const ref = await fetch(`${base}/auth/refresh`, { method: "POST", headers: { cookie: setCookie.split(",").map(s=>s.split(";")[0]).join("; ") } });
  const refBody = await ref.json();
  must(ref.status === 201 || ref.status === 200, "refresh failed");
  must(refBody.accessToken && refBody.refreshToken, "refresh missing tokens");

  // logout
  const lo = await fetch(`${base}/auth/logout`, { method: "POST", headers: { cookie: setCookie.split(",").map(s=>s.split(";")[0]).join("; ") } });
  must(lo.status === 204, "logout failed");

  console.log("✅ E2E auth flow OK");
})().catch(e => { console.error("❌ E2E failed:", e.message); process.exit(1); });
