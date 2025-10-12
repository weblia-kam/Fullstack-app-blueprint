"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Sending…");
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/auth/request-magic-link`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMsg(r.ok ? "Check your email (MailHog on :8025)!" : "Failed.");
  };
  return (
    <div style={{ maxWidth: 420, margin: "64px auto", lineHeight: 1.6 }}>
      <h1>Sign in</h1>
      <form onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ padding: 8, width: "100%", marginTop: 12 }}
        />
        <button type="submit" style={{ marginTop: 12, padding: "8px 12px" }}>Send magic link</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
