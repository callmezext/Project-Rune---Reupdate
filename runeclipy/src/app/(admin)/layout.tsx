"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const adminItems = [
  { href: "/admin", icon: "📊", label: "Dashboard", exact: true },
  { href: "/admin/campaigns", icon: "🎵", label: "Campaigns" },
  { href: "/admin/submissions", icon: "🎬", label: "Submissions" },
  { href: "/admin/users", icon: "👥", label: "Users" },
  { href: "/admin/accounts", icon: "🔗", label: "Accounts" },
  { href: "/admin/payouts", icon: "💸", label: "Payouts" },
  { href: "/admin/finance", icon: "📈", label: "Finance" },
  { href: "/admin/settings", icon: "⚙️", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d.isLoggedIn || d.role !== "admin") router.push("/dashboard");
        else setAuthorized(true);
      });
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-4xl animate-pulse">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Admin Sidebar */}
      <aside className="sticky top-0 h-screen w-56 bg-bg-secondary border-r border-border flex flex-col py-6 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 mb-2 px-2">
          <span className="text-xl">🔮</span>
          <span className="font-bold gradient-text text-sm">RuneClipy</span>
        </Link>
        <div className="badge bg-error/20 text-error text-[10px] mb-6 mx-2 w-fit">ADMIN PANEL</div>

        <nav className="flex flex-col gap-1 flex-1">
          {adminItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isActive ? "bg-accent/15 text-accent-light font-medium" : "text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                )}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-bg-tertiary transition-all">
          <span>←</span> Back to Dashboard
        </Link>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
