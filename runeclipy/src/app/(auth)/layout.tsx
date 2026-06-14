import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Login — RuneClipy" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-pink/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8 flex justify-center">
          <Link href="/" className="inline-block hover:opacity-95 transition-opacity">
            <Logo iconSize={26} textSize="text-2xl" />
          </Link>
        </div>

        {children}

        {/* Footer links */}
        <div className="text-center mt-6 flex justify-center gap-4">
          <Link href="/creator-terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Creator Terms</Link>
          <Link href="/privacy-policy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
