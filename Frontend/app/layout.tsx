import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Elhafazah Academy",
    default: "Elhafazah Academy | Online Quran Memorization",
  },
  description: "One-on-one live classes in Hifz, Tajweed, and Noorani Qaida. Personalised plans for children and adults — guided by certified instructors.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Next.js emits a hashed <link rel="icon"> for app/icon.png on its own, but
  // Safari prefers a stable /favicon.* path and caches whatever it finds there
  // very aggressively — so public/favicon.png is served at a fixed URL too and
  // declared explicitly. Both files are the same brand mark (gold ح on
  // emerald), matching the Admin-CMS favicon and the OAuth consent-screen logo.
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by proxy.ts on every request so the root layout — the only place
  // Next.js allows <html>/<body> to be rendered — can pick the right
  // lang/dir for the marketing pages (app/page.tsx vs app/ar/page.tsx)
  // instead of hardcoding English for Arabic-language routes too.
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isArabic = pathname === "/ar" || pathname.startsWith("/ar/");

  return (
    <html lang={isArabic ? "ar" : "en"} dir={isArabic ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&family=Tajawal:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: '#0C3326' }}>{children}</body>
    </html>
  );
}
