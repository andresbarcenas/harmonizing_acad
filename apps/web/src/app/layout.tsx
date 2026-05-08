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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCookieLocale();

  return (
    <html lang={locale} className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
