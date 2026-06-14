import type { Metadata, Viewport } from "next";
import { Outfit, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <body className="antialiased overflow-x-hidden">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#111827",
              border: "1px solid #1E293B",
              color: "#F9FAFB",
              borderRadius: "12px",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
