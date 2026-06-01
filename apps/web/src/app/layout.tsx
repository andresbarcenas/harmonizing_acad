import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { getCookieLocale } from "@/lib/i18n/request";
import "./globals.css";

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harmonizing",
  description: "Premium online music academy for students in the United States.",
};

const themeScript = `
(() => {
  const key = "harmonizing:theme";
  const valid = new Set(["light", "dark", "system"]);
  const readCookie = () => {
    const match = document.cookie.split("; ").find((row) => row.startsWith(key + "="));
    return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
  };
  const readPreference = () => {
    try {
      const stored = window.localStorage.getItem(key);
      if (valid.has(stored)) return stored;
    } catch {}
    const cookie = readCookie();
    return valid.has(cookie) ? cookie : "system";
  };
  const resolve = (preference) => {
    if (preference === "dark") return "dark";
    if (preference === "light") return "light";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const theme = resolve(readPreference());
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCookieLocale();

  return (
    <html lang={locale} className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
