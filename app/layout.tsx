import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
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

// Inline script to prevent theme flash - runs before React hydrates
const themeScript = `
(function() {
  try {
    var theme = document.cookie.match('(?:^|; )tirbeo_theme=([^;]*)');
    var t = theme ? decodeURIComponent(theme[1]) : 'dark';
    if (t === 'dark' || t === 'light') {
      document.documentElement.classList.add(t);
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
