"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard using replace
    // so /login is NOT added to browser history stack
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          router.replace("/dashboard");
        }
      })
      .catch(() => { /* not logged in, stay on login page */ });
  }, [router]);

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
