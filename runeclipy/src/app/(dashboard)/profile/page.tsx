"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface UserProfile {
  nickname: string;
  username: string;
  email: string;
  memberSince: string;
  referralCode: string;
  stats: { totalVideos: number; totalEarned: number; totalViews: number };
  paymentMethods: { type: string; email?: string; phone?: string; nickname?: string; isDefault: boolean }[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ type: "paypal", email: "", phone: "", nickname: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.user); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_payment", payment: paymentForm }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowPaymentModal(false);
      setPaymentForm({ type: "paypal", email: "", phone: "", nickname: "" });
      // Refresh
      const refresh = await fetch("/api/profile").then((r) => r.json());
      if (refresh.success) setProfile(refresh.user);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
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

      {/* Payment Methods */}
      <div className="glass-card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Payment Methods</h3>
          <button onClick={() => setShowPaymentModal(true)} className="text-sm text-accent-light hover:text-accent transition-colors">+ Add</button>
        </div>

        {profile.paymentMethods.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted mb-3">No payment methods added yet</p>
            <button onClick={() => setShowPaymentModal(true)} className="btn-gradient !rounded-xl text-xs !py-2 !px-4">Add Payment Method</button>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.paymentMethods.map((pm, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pm.type === "paypal" ? "🅿️" : "💳"}</span>
                  <div>
                    <div className="text-sm font-medium capitalize">{pm.type}{pm.nickname ? ` — ${pm.nickname}` : ""}</div>
                    <div className="text-xs text-text-muted">{pm.email || pm.phone}</div>
                  </div>
                </div>
                {pm.isDefault && <span className="badge badge-active text-[10px]">Default</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login Methods */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">Login Methods</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
            <div className="flex items-center gap-3">
              <span className="text-xl">📧</span>
              <div>
                <div className="text-sm font-medium">Email & Password</div>
                <div className="text-xs text-text-muted">{profile.email}</div>
              </div>
            </div>
            <span className="badge badge-active text-[10px]">Active</span>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="glass-card p-8 max-w-md w-full animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-6">Add Payment Method</h2>
            <form onSubmit={addPaymentMethod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
                <select value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="input-field">
                  <option value="paypal">PayPal</option>
                  <option value="dana">Dana</option>
                </select>
              </div>
              {paymentForm.type === "paypal" ? (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">PayPal Email</label>
                  <input type="email" value={paymentForm.email} onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                    className="input-field" placeholder="pay@email.com" required />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Dana Phone Number</label>
                  <input type="tel" value={paymentForm.phone} onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                    className="input-field" placeholder="08123456789" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Nickname <span className="text-text-muted">(optional)</span></label>
                <input type="text" value={paymentForm.nickname} onChange={(e) => setPaymentForm({ ...paymentForm, nickname: e.target.value })}
                  className="input-field" placeholder="Main account" />
              </div>
              <button type="submit" disabled={saving} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
                {saving ? "Saving..." : "Add Payment Method"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
