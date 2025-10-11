import React from "react";
import "./globals.css";
export const metadata = { title: "Blueprint App", description: "Fullstack blueprint" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><main style={{ padding: 24 }}>{children}</main></body>
    </html>
  );
}
