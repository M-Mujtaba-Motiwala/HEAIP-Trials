// =============================================================================
// Root Layout — Hamdard AI Platform
// The top-level layout wrapping every page with fonts, metadata, and providers
// =============================================================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hamdard AI Platform",
    template: "%s | Hamdard AI Platform",
  },
  description:
    "Enterprise AI Platform for Hamdard Pakistan — Secure, centralized AI assistance for all employees.",
  keywords: ["Hamdard", "AI", "Enterprise", "Pakistan", "ChatGPT", "Gemini"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
