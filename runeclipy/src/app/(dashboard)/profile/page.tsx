"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface UserProfile {
  nickname: string;
  username: string;
  email: string;
  role: string;
  memberSince: string;
  referralCode: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  hasDiscord: boolean;
  stats: { totalVideos: number; totalEarned: number; totalViews: number };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.user); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleGoogleBind = () => {
    window.location.href = "/api/auth/google";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">👤</div></div>;
  if (!profile) return <div className="text-center py-20 text-text-muted">Failed to load profile</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Profile</h1>

      {/* User Info */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-pink flex items-center justify-center text-2xl font-bold">
            {profile.nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.nickname}</h2>
            <p className="text-sm text-text-muted font-mono">@{profile.username}</p>
            <p className="text-xs text-text-muted">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-bg-primary/50 border border-border">
          <div className="text-center">
            <div className="text-lg font-extrabold">{formatNumber(profile.stats.totalVideos)}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold gradient-text">{formatCurrency(profile.stats.totalEarned)}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Earned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold">{formatNumber(profile.stats.totalViews)}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Views</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
          <span>🗓️</span> Member since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">Connected Accounts</h3>
        <div className="space-y-3">

          {/* Email & Password */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium">Email & Password</div>
                <div className="text-xs text-text-muted">{profile.email}</div>
              </div>
            </div>
            {profile.hasPassword ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            ) : (
              <span className="text-xs text-text-muted px-3 py-1.5 rounded-lg bg-bg-tertiary">No password set</span>
            )}
          </div>

          {/* Google */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium">Google</div>
                <div className="text-xs text-text-muted">{profile.hasGoogle ? "Account linked" : "Not connected"}</div>
              </div>
            </div>
            {profile.hasGoogle ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            ) : (
              <button
                onClick={handleGoogleBind}
                className="px-4 py-1.5 rounded-lg bg-accent/15 text-accent-light text-xs font-semibold hover:bg-accent/25 transition-colors"
              >
                Connect
              </button>
            )}
          </div>

          {/* Discord (future) */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium">Discord</div>
                <div className="text-xs text-text-muted">Coming soon</div>
              </div>
            </div>
            <span className="text-xs text-text-muted px-3 py-1.5 rounded-lg bg-bg-tertiary">Soon</span>
          </div>

        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 border-error/20">
        <h3 className="font-bold text-lg text-error mb-2">Danger Zone</h3>
        <p className="text-xs text-text-muted mb-4">Once you delete your account, there is no going back.</p>
        <button className="px-4 py-2 rounded-xl border border-error/30 text-error text-sm hover:bg-error/10 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
