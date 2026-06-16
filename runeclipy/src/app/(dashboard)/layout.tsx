"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn, timeAgo } from "@/lib/utils";
import Logo from "@/components/Logo";

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

const formatCompactCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [profile, setProfile] = useState<{ nickname?: string; email?: string; stats?: { totalEarned: number } } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("default");
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const themes = [
    { id: "default", name: "Default (Dark Navy)", previewColor: "#8B5CF6" },
    { id: "ame", name: "Ame (Violet & Gold)", previewColor: "#F59E0B" },
    { id: "emerald", name: "Emerald Forest", previewColor: "#10B981" },
    { id: "ocean", name: "Ocean Depths", previewColor: "#3B82F6" },
    { id: "vampire", name: "Crimson Vampire", previewColor: "#EF4444" },
    { id: "cyberpunk", name: "Cyberpunk 2077", previewColor: "#FACC15" },
    { id: "obsidian", name: "Midnight Obsidian", previewColor: "#9CA3AF" },
    { id: "sakura", name: "Sakura Dream", previewColor: "#F472B6" },
    { id: "frost", name: "Nordic Frost", previewColor: "#0284C7" },
    { id: "sunset", name: "Sunset Horizon", previewColor: "#D97706" },
    { id: "toxic", name: "Toxic Wasteland", previewColor: "#84CC16" },
    { id: "royal", name: "Royal Amethyst", previewColor: "#A855F7" },
    { id: "arcade", name: "Retro Arcade", previewColor: "#06B6D4" },
    { id: "coffee", name: "Coffee Roast", previewColor: "#78716C" },
    { id: "matrix", name: "Hacker Matrix", previewColor: "#22C55E" },
  ];

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
    // Load theme
    const savedTheme = localStorage.getItem("theme") || "default";
    setActiveTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.replace("/login");
        } else {
          setProfile(data.user);
          setUser({ username: data.user.username, role: data.user.role });
          fetchNotifications();
        }
      })
      .catch(() => router.replace("/login"));
  }, [router, fetchNotifications]);

  const changeTheme = (newTheme: string) => {
    localStorage.setItem("theme", newTheme);
    setActiveTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    setThemeOpen(false);
  };

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
        <div className="text-center flex flex-col items-center gap-3">
          <Logo showText={false} iconSize={26} className="animate-pulse" />
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-extrabold animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* ═══ Header/Navbar ═══ */}
      <header className="sticky top-0 z-40 bg-[#0B0E14] border-b border-border px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto w-full">
          {/* Left: Brand/Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:opacity-95 transition-opacity">
              <Logo iconSize={18} textSize="text-base" />
            </Link>

            {/* Horizontal Tabs */}
            <nav className="hidden sm:flex items-center gap-2">
              <Link
                href="/dashboard"
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-transparent",
                  (pathname === "/dashboard" || pathname.startsWith("/dashboard/detail"))
                    ? "bg-accent/15 text-white border-accent/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary/30"
                )}
              >
                <svg className={cn("w-4 h-4", (pathname === "/dashboard" || pathname.startsWith("/dashboard/detail")) ? "text-accent" : "text-text-muted")} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
                </svg>
                Explore
              </Link>
              
              <Link
                href="/campaigns"
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-transparent",
                  pathname.startsWith("/campaigns")
                    ? "bg-accent/15 text-white border-accent/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary/30"
                )}
              >
                <svg className={cn("w-4 h-4", pathname.startsWith("/campaigns") ? "text-accent" : "text-text-muted")} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-13m0 0C5 7 7 9 10 9s5-2 8-2 5 2 6 2v10c-1 0-3-2-6-2s-5 2-8 2-5-2-7-2m0-3h18" />
                </svg>
                My Activity
              </Link>
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {/* Balance Card */}
            <div className="flex items-center gap-1.5 font-bold text-sm bg-transparent border border-border/40 px-3 py-1.5 rounded-xl">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-white">{formatCompactCurrency(profile?.stats?.totalEarned || 0)}</span>
            </div>

            {/* Invite & Earn */}
            <Link
              href="/balance/referrals"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all px-3 py-1.5 rounded-xl hover:bg-bg-tertiary/30"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM2 20a7 7 0 0112 0v1H2v-1z" />
              </svg>
              Invite & Earn
            </Link>

            {/* Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:bg-bg-tertiary/40 hover:text-text-primary transition-all"
                title="Change Theme"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>

              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div className="absolute right-0 top-full mt-2.5 w-48 bg-bg-secondary border border-border rounded-2xl shadow-2xl p-2 z-50 animate-fadeInUp max-h-[300px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">Select Theme</div>
                    <div className="border-t border-border my-1" />
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => changeTheme(t.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-bg-tertiary transition-all",
                          activeTheme === t.id ? "bg-accent/15 text-accent-light" : "text-text-secondary"
                        )}
                      >
                        <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: t.previewColor }} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:bg-bg-tertiary/40 hover:text-text-primary transition-all relative"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-error text-[8px] text-white font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-bg-secondary border border-border rounded-2xl overflow-hidden z-50 animate-fadeInUp sm:right-0 max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-14 max-sm:w-auto shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <span className="font-bold text-sm text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-error hover:text-error/85 font-semibold">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-text-muted text-xs">No notifications yet</div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n._id}
                            className={cn(
                              "px-4 py-3 border-b border-border/50 hover:bg-bg-primary/30 transition-colors cursor-pointer",
                              !n.isRead && "bg-error/5"
                            )}
                            onClick={() => { if (n.link) router.push(n.link); setNotifOpen(false); }}
                          >
                            <div className="flex gap-3">
                              <span className="text-lg flex-shrink-0">{n.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate text-text-primary">{n.title}</div>
                                <div className="text-xs text-text-muted line-clamp-2">{n.message}</div>
                                <div className="text-[10px] text-text-muted mt-1">{timeAgo(new Date(n.createdAt))}</div>
                              </div>
                              {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0 mt-1.5" />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-full bg-rose-300 text-rose-950 flex items-center justify-center text-sm font-extrabold hover:opacity-90 transition-all select-none border border-rose-400"
              >
                {user.username.charAt(0).toUpperCase()}
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2.5 w-60 bg-bg-secondary border border-border rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeInUp">
                    <div className="px-3 py-2">
                      <p className="text-sm font-bold text-text-primary truncate">{profile?.nickname || user.username}</p>
                      <p className="text-xs text-text-muted truncate">{profile?.email || ""}</p>
                    </div>
                    <div className="border-t border-border my-2" />
                    <div className="space-y-1">
                      <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all" onClick={() => setProfileOpen(false)}>
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                      <Link href="/accounts" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all" onClick={() => setProfileOpen(false)}>
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        </svg>
                        Connected Accounts
                      </Link>
                      <Link href="/leaderboard" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all" onClick={() => setProfileOpen(false)}>
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Leaderboard
                      </Link>
                      {user.role === "admin" && (
                        <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error/5 transition-all" onClick={() => setProfileOpen(false)}>
                          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                          </svg>
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-border my-2" />
                      <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-error/5 hover:text-error transition-all w-full text-left">
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav Header */}
      <nav className="sm:hidden flex justify-around bg-[#0B0E14] border-b border-border py-2.5 px-4 shadow-md">
        <Link
          href="/dashboard"
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5",
            (pathname === "/dashboard" || pathname.startsWith("/dashboard/detail"))
              ? "bg-error/15 text-white"
              : "text-text-muted"
          )}
        >
          Explore
        </Link>
        <Link
          href="/campaigns"
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5",
            pathname.startsWith("/campaigns")
              ? "bg-error/15 text-white"
              : "text-text-muted"
          )}
        >
          My Activity
        </Link>
        <Link
          href="/balance/referrals"
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5",
            pathname.startsWith("/balance/referrals") ? "bg-error/15 text-white" : "text-text-muted"
          )}
        >
          Invite
        </Link>
      </nav>

      {/* ═══ Page Content ═══ */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl w-full mx-auto animate-fadeIn">
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
  );
}
