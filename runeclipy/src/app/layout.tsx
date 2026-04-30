import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RuneClipy — Creator Music Promotion Platform",
  description: "Join thousands of creators. Use trending sounds, create content, and earn real payouts based on your views.",
  keywords: ["tiktok", "creator", "music promotion", "earn money", "campaign", "content creator"],
  openGraph: {
    title: "RuneClipy — Creator Music Promotion Platform",
    description: "Turn your short-form videos into real earnings with music promotion campaigns.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
