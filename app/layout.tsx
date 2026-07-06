import type { Metadata } from "next";
import { AuthProvider } from "@tirbeo/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accounts — Tirbeo",
  description: "Sign in to Tirbeo",
};

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
