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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="admin-loader">
          <div className="admin-loader-ring" />
          <span className="text-sm text-text-muted mt-4">Verifying admin access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 h-screen w-64 bg-bg-secondary/95 backdrop-blur-xl border-r border-border flex flex-col z-50 transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="p-5 pb-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🔮</span>
            <div>
              <span className="font-bold gradient-text text-base tracking-tight">RuneClipy</span>
              <div className="admin-badge">ADMIN</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 flex-1 px-3 py-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-text-muted/50 font-semibold px-3 mb-2">
            Navigation
          </div>
          {adminItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "admin-nav-item",
                  isActive && "admin-nav-item--active"
                )}
              >
                <span className="text-lg w-7 text-center shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <div className="admin-nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/50">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-all group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-bg-secondary/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold gradient-text text-sm">RuneClipy Admin</span>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
