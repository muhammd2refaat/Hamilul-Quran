import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Hamilul-Quran",
    default: "Hamilul-Quran | Online Quran Memorization Academy",
  },
  description: "Hamilul-Quran provides one-on-one sessions, structured memorization tracking, and a community of certified teachers dedicated to your success in memorizing the Holy Quran.",
  keywords: ["Quran", "Memorization", "Tahfiz", "Online Quran Academy", "Tajweed", "Hamilul-Quran"],
  openGraph: {
    title: "Hamilul-Quran | Online Quran Memorization Academy",
    description: "Empowering your Quranic journey with expert teachers and structured memorization tracking.",
    siteName: "Hamilul-Quran",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
