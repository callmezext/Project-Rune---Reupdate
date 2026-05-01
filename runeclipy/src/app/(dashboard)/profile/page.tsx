"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type ModalType = "change-password" | "change-email" | "change-email-otp" | "delete-account" | null;

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modal form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfile = () => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.user); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  // ─── Actions ────────────────────────────────────

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { showToast("error", "Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { showToast("error", "Passwords don't match"); return; }

    setActionLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Password changed successfully");
      setModal(null);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail) { showToast("error", "Enter a new email"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_email_change", newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Verification code sent to new email");
      setModal("change-email-otp");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (emailOtp.length < 6) { showToast("error", "Enter the 6-digit code"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_email_change", newEmail, otp: emailOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Email changed successfully!");
      setModal(null);
      setNewEmail(""); setEmailPassword(""); setEmailOtp("");
      fetchProfile(); // Refresh
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const router = useRouter();

  const handleGoogleBind = () => {
    window.location.href = "/api/auth/google";
  };

  const handleGoogleUnbind = async () => {
    if (!confirm("Are you sure you want to disconnect Google? Make sure you have a password set.")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unbind_google" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Google disconnected");
      fetchProfile();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_account", password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Account deleted. Redirecting...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="h-8 w-32 bg-bg-tertiary rounded-lg animate-pulse" />
      {[1, 2, 3].map(i => <div key={i} className="h-40 bg-bg-tertiary rounded-2xl animate-pulse" />)}
    </div>
  );
  if (!profile) return <div className="text-center py-20 text-text-muted">Failed to load profile</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* ─── Toast ─── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-fadeInUp flex items-center gap-2 ${
          toast.type === "success"
            ? "bg-success/15 border border-success/30 text-success"
            : "bg-error/15 border border-error/30 text-error"
        }`}>
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-8">Profile & Security</h1>

      {/* ═══ User Info Card ═══ */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-pink flex items-center justify-center text-2xl font-bold">
            {profile.nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.nickname}</h2>
            <p className="text-sm text-text-muted font-mono">@{profile.username}</p>
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

      {/* ═══ Connected Accounts ═══ */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold text-lg mb-5">Connected Accounts</h3>
        <div className="space-y-3">

          {/* ── Username (Permanent) ── */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-light" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium">Username</div>
                <div className="text-xs text-text-muted font-mono">@{profile.username}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-muted text-xs font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Permanent
            </div>
          </div>

          {/* ── Email & Password ── */}
          <div className="p-4 rounded-xl bg-bg-primary/50 border border-border">
            <div className="flex items-center justify-between mb-3">
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2 ml-[52px]">
              <button
                onClick={() => setModal("change-email")}
                className="px-3 py-1.5 rounded-lg bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors"
              >
                Change Email
              </button>
              <button
                onClick={() => setModal("change-password")}
                className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent-light text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                {profile.hasPassword ? "Change Password" : "Set Password"}
              </button>
            </div>
          </div>

          {/* ── Google ── */}
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Connected
                </div>
                <button
                  onClick={handleGoogleUnbind}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-medium hover:bg-error/20 transition-colors disabled:opacity-50"
                >
                  Unbind
                </button>
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

          {/* ── Discord (Soon) ── */}
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

      {/* ═══ Danger Zone ═══ */}
      <div className="glass-card p-6 border-error/20">
        <h3 className="font-bold text-lg text-error mb-2">Danger Zone</h3>
        <p className="text-xs text-text-muted mb-4">Once you delete your account, there is no going back.</p>
        <button
          onClick={() => { setModal("delete-account"); setDeletePassword(""); }}
          className="px-4 py-2 rounded-xl border border-error/30 text-error text-sm hover:bg-error/10 transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* ═══ MODALS ═══ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fadeInUp" onClick={(e) => e.stopPropagation()}>

            {/* ── Change Password Modal ── */}
            {modal === "change-password" && (
              <>
                <h3 className="text-lg font-bold mb-1">{profile.hasPassword ? "Change Password" : "Set Password"}</h3>
                <p className="text-xs text-text-muted mb-5">
                  {profile.hasPassword ? "Verify your current password first" : "Set a password for email/username login"}
                </p>
                <div className="space-y-3">
                  {profile.hasPassword && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Current Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-field" placeholder="••••••••" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field" placeholder="Min. 6 characters" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field" placeholder="Repeat password" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleChangePassword} disabled={actionLoading}
                    className="flex-1 btn-gradient !rounded-xl text-sm !py-2.5 disabled:opacity-50">
                    {actionLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}

            {/* ── Change Email Modal ── */}
            {modal === "change-email" && (
              <>
                <h3 className="text-lg font-bold mb-1">Change Email</h3>
                <p className="text-xs text-text-muted mb-5">Enter your new email. We&apos;ll send a verification code.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Current Email</label>
                    <input type="email" value={profile.email} disabled className="input-field opacity-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">New Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      className="input-field" placeholder="new@email.com" />
                  </div>
                  {profile.hasPassword && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Your Password</label>
                      <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)}
                        className="input-field" placeholder="Verify your identity" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleRequestEmailChange} disabled={actionLoading}
                    className="flex-1 btn-gradient !rounded-xl text-sm !py-2.5 disabled:opacity-50">
                    {actionLoading ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </>
            )}

            {/* ── Verify Email Change OTP ── */}
            {modal === "change-email-otp" && (
              <>
                <h3 className="text-lg font-bold mb-1">Verify New Email</h3>
                <p className="text-xs text-text-muted mb-5">
                  Enter the 6-digit code sent to <strong className="text-text-primary">{newEmail}</strong>
                </p>
                <div>
                  <input type="text" value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="input-field text-center text-2xl tracking-[12px] font-mono font-bold"
                    placeholder="000000" maxLength={6} autoFocus />
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setModal("change-email")} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                    ← Back
                  </button>
                  <button onClick={handleConfirmEmailChange} disabled={actionLoading || emailOtp.length < 6}
                    className="flex-1 btn-gradient !rounded-xl text-sm !py-2.5 disabled:opacity-50">
                    {actionLoading ? "Verifying..." : "Confirm"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ═══ Delete Account Confirmation Modal ═══ */}
      {modal === "delete-account" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-error mb-1">⚠️ Delete Account</h3>
            <p className="text-xs text-text-muted mb-5">
              This action is <strong>permanent</strong>. All your data, submissions, earnings, and connected accounts will be lost forever.
            </p>
            <div className="p-4 rounded-xl bg-error/5 border border-error/20 mb-5">
              <p className="text-xs text-error font-medium mb-3">
                To confirm, please enter your password:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input-field"
                placeholder="Your password"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={actionLoading || (!deletePassword && profile?.hasPassword)}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-bold hover:bg-error/80 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
