import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TirbeoThemeProvider } from "@tirbeo/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tirbeo Account",
  description: "Sign in to your Tirbeo account",
};

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <TirbeoThemeProvider>{children}</TirbeoThemeProvider>
      </body>
    </html>
  );
}
