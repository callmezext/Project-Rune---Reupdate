"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn, timeAgo } from "@/lib/utils";

interface Notif {
  _id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const navItems = [
  {
    href: "/dashboard", label: "Campaigns", match: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    href: "/campaigns", label: "My Submissions", match: "/campaigns",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/accounts", label: "Accounts", match: "/accounts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
      </svg>
    ),
  },
  {
    href: "/balance", label: "Balance", match: "/balance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/profile", label: "Profile", match: "/profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) router.push("/login");
        else {
          setUser({ username: data.username, role: data.role });
          fetchNotifications();
        }
      })
      .catch(() => router.push("/login"));
  }, [router, fetchNotifications]);

  // Poll notifications every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
  };

  const isNavActive = (item: typeof navItems[0]) =>
    pathname === item.href
    || (item.href !== "/dashboard" && pathname.startsWith(item.match))
    || (item.href === "/dashboard" && (pathname === "/dashboard" || pathname.startsWith("/dashboard/detail")));

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔮</div>
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  /* ─── Sidebar content (shared desktop + mobile) ─── */
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <span className="text-2xl group-hover:scale-110 transition-transform">🔮</span>
          <span className="text-lg font-bold gradient-text tracking-wider">RUNECLIPY</span>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isNavActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-accent/15 text-accent-light"
                  : "text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              )}
            >
              <span className={cn("transition-colors", active ? "text-accent-light" : "text-text-muted group-hover:text-text-secondary")}>
                {item.icon}
              </span>
              {item.label}
              {active && <span className="ml-auto w-1 h-5 rounded-full bg-accent" />}
            </Link>
          );
        })}

        {user.role === "admin" && (
          <>
            <div className="border-t border-border my-3" />
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                pathname.startsWith("/admin")
                  ? "bg-error/10 text-error"
                  : "text-text-muted hover:text-error hover:bg-error/5"
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Bottom: User card */}
      <div className="px-3 pb-4 mt-auto border-t border-border pt-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-pink flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
              @{user.username}
              {user.role === "admin" && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-error/20 text-error">ADMIN</span>}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-error hover:bg-error/5 transition-all w-full mt-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* ═══ Desktop Sidebar ═══ */}
      <aside className="hidden md:flex sticky top-0 h-screen w-60 bg-bg-secondary border-r border-border flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* ═══ Mobile Overlay ═══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-bg-secondary border-r border-border flex flex-col animate-slideInLeft">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile hamburger + notification) */}
        <header className="sticky top-0 z-40 bg-bg-secondary/80 backdrop-blur-xl border-b border-border px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: hamburger (mobile) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop: page title area (empty spacer) */}
            <div className="hidden md:block" />

            {/* Right: Notification Bell */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-all relative"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-[9px] text-white font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 glass-card overflow-hidden z-50 animate-fadeInUp">
                      <div className="flex items-center justify-between p-4 border-b border-border">
                        <span className="font-bold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-accent-light hover:text-accent">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-text-muted text-sm">No notifications yet</div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n._id}
                              className={cn(
                                "px-4 py-3 border-b border-border/50 hover:bg-bg-primary/30 transition-colors cursor-pointer",
                                !n.isRead && "bg-accent/5"
                              )}
                              onClick={() => { if (n.link) router.push(n.link); setNotifOpen(false); }}
                            >
                              <div className="flex gap-3">
                                <span className="text-lg flex-shrink-0">{n.icon}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{n.title}</div>
                                  <div className="text-xs text-text-muted line-clamp-2">{n.message}</div>
                                  <div className="text-[10px] text-text-muted mt-1">{timeAgo(new Date(n.createdAt))}</div>
                                </div>
                                {!n.isRead && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ═══ Page Content ═══ */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-border px-6 py-4 mt-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 max-w-7xl mx-auto">
            <p className="text-xs text-text-muted">© 2026 RuneClipy</p>
            <div className="flex gap-4">
              <Link href="/creator-terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Creator Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
