"use client";
import { useState } from "react";
import { apiFetch, useCsrfToken } from "../../../lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    password: "",
    acceptedTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { token: csrfToken, refresh: refreshCsrf } = useCsrfToken();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("Oppretter konto …");
    try {
      if (!csrfToken) {
        await refreshCsrf();
      }
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          birthDate: form.birthDate || undefined,
          password: form.password,
          acceptedTerms: form.acceptedTerms
        })
      });
      if (res.ok) {
        setMsg("Konto opprettet!");
        window.location.href = "/profile";
      } else {
        const err = await res.text();
        setMsg(`Feil: ${err}`);
      }
    } catch (e: any) {
      setMsg(`Feil: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", lineHeight: 1.5 }}>
      <h1>Opprett konto</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          name="firstName"
          placeholder="Fornavn"
          value={form.firstName}
          onChange={handleChange}
          required
        />
        <input
          name="lastName"
          placeholder="Etternavn"
          value={form.lastName}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="E-post"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="phone"
          placeholder="Telefon (valgfritt)"
          value={form.phone}
          onChange={handleChange}
        />
        <label style={{ fontSize: 14, marginTop: 4 }}>
          Fødselsdato:
          <input
            type="date"
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            style={{ display: "block", width: "100%", marginTop: 2 }}
          />
        </label>
        <input
          type="password"
          name="password"
          placeholder="Passord (minst 8 tegn)"
          value={form.password}
          onChange={handleChange}
          required
        />
        <label style={{ fontSize: 14 }}>
          <input
            type="checkbox"
            name="acceptedTerms"
            checked={form.acceptedTerms}
            onChange={handleChange}
            required
          />{" "}
          Jeg godtar vilkårene for bruk
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            background: "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          {loading ? "Sender..." : "Opprett konto"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <p style={{ marginTop: 16 }}>
        Har du allerede en konto?{" "}
        <a href="/login" style={{ color: "#0066cc" }}>
          Logg inn
        </a>
      </p>
    </div>
  );
}
