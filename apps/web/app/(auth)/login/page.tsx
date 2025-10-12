"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const [tab, setTab] = useState<"pw" | "ml">("pw");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Signing in…");
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (r.ok) window.location.href = "/profile";
    else setMsg("Login failed");
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Sending link…");
    const r = await fetch(`${API}/auth/request-magic-link`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMsg(r.ok ? "Check MailHog (:8025) for the signin link." : "Failed to send link");
  };

  return (
    <div style={{ maxWidth: 480, margin: "64px auto", lineHeight: 1.6 }}>
      <h1>Sign in</h1>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={() => setTab("pw")} disabled={tab === "pw"}>
          Password
        </button>
        <button onClick={() => setTab("ml")} disabled={tab === "ml"}>
          Magic link
        </button>
      </div>

      {tab === "pw" && (
        <form onSubmit={login} style={{ marginTop: 16 }}>
          <input
            placeholder="username or email"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ padding: 8, width: "100%" }}
          />
          <input
            placeholder="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 8, width: "100%", marginTop: 8 }}
          />
          <button type="submit" style={{ marginTop: 12, padding: "8px 12px" }}>
            Sign in
          </button>
          <p style={{ marginTop: 8 }}>
            <small>No account? Ask admin or use magic link.</small>
          </p>
        </form>
      )}

      {tab === "ml" && (
        <form onSubmit={sendLink} style={{ marginTop: 16 }}>
          <input
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 8, width: "100%" }}
          />
          <button type="submit" style={{ marginTop: 12, padding: "8px 12px" }}>
            Send magic link
          </button>
        </form>
      )}

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
