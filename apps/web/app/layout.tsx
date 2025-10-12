import React from "react";
import "./globals.css";

export const metadata = { title: "Blueprint App", description: "Fullstack blueprint" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: "12px 16px", borderBottom: "1px solid #ddd" }}>
          <nav style={{ display: "flex", gap: 16 }}>
            <a href="/">Home</a>
            <a href="/login">Login</a>
            <a href="/profile">Profile</a>
          </nav>
        </header>
        <main style={{ padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
