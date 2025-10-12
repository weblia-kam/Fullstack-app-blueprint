import { cookies } from "next/headers";

async function getMe() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookie = cookies().toString(); // videresend cookies til API
  const headers: Record<string, string> = cookie ? { cookie } : {};
  const r = await fetch(`${api}/me`, { headers, cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Profile() {
  const data = await getMe();
  return (
    <div style={{ padding: 24 }}>
      <h1>Profile</h1>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(data?.user ?? null, null, 2)}</pre>
      <a href="/login">Log in</a>
    </div>
  );
}
