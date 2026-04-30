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

const sidebarItems = [
  { href: "/dashboard", icon: "🎵", label: "Campaigns", match: "/dashboard" },
  { href: "/campaigns", icon: "🏳️", label: "My Campaigns", match: "/campaigns" },
  { href: "/accounts", icon: "🔗", label: "Accounts", match: "/accounts" },
  { href: "/balance", icon: "💰", label: "Balance", match: "/balance" },
  { href: "/profile", icon: "👤", label: "Profile", match: "/profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-[72px] bg-bg-secondary border-r border-border flex flex-col items-center py-6 z-50 transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <Link href="/dashboard" className="text-2xl mb-8 hover:scale-110 transition-transform">🔮</Link>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2 flex-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.match));
            const isDashActive = item.href === "/dashboard" && (pathname === "/dashboard" || pathname.startsWith("/dashboard/detail"));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all relative group",
                  (isActive || isDashActive)
                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                    : "text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                {item.icon}
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {user.role === "admin" && (
            <Link
              href="/admin"
              title="Admin Panel"
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all relative group",
                pathname.startsWith("/admin")
                  ? "bg-error text-white shadow-lg shadow-error/25"
                  : "text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              )}
            >
              ⚙️
              <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Admin Panel
              </span>
            </Link>
          )}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg text-text-muted hover:bg-error/10 hover:text-error transition-all relative group"
        >
          🚪
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Logout
          </span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-xl text-text-muted hover:text-text-primary">☰</button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold gradient-text tracking-wider hidden sm:inline">RUNECLIPY</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-all relative">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-error text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
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
                          <div key={n._id}
                            className={cn("px-4 py-3 border-b border-border/50 hover:bg-bg-primary/30 transition-colors cursor-pointer",
                              !n.isRead && "bg-accent/5"
                            )}
                            onClick={() => { if (n.link) router.push(n.link); setNotifOpen(false); }}>
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

            <span className="text-sm text-text-secondary font-mono">@{user.username}</span>
            {user.role === "admin" && <span className="badge badge-music text-[10px]">ADMIN</span>}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-4 mt-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 max-w-7xl mx-auto">
            <p className="text-xs text-text-muted">© 2026 RuneClipy</p>
            <div className="flex gap-4">
              <Link href="/creator-terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Creator Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
