"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Settings {
  platformFeePercent: number;
  minCampaignWithdrawal: number;
  minReferralWithdrawal: number;
  referralCommissionPercent: number;
  discordWebhookUrl: string;
  discordInviteUrl: string;
  discordNotifChannelId: string;
  supportEmail: string;
  geminiApiKey: string;
}

type Toast = { message: string; type: "success" | "error" | "info" } | null;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformFeePercent: 3, minCampaignWithdrawal: 10, minReferralWithdrawal: 30,
    referralCommissionPercent: 5, discordWebhookUrl: "",
    discordInviteUrl: "", discordNotifChannelId: "", supportEmail: "",
    geminiApiKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "valid" | "invalid">("idle");

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) {
          setSettings({
            platformFeePercent: d.settings.platformFeePercent ?? 3,
            minCampaignWithdrawal: d.settings.minCampaignWithdrawal ?? 10,
            minReferralWithdrawal: d.settings.minReferralWithdrawal ?? 30,
            referralCommissionPercent: d.settings.referralCommissionPercent ?? 5,
            discordWebhookUrl: d.settings.discordWebhookUrl ?? "",
            discordInviteUrl: d.settings.discordInviteUrl ?? "",
            discordNotifChannelId: d.settings.discordNotifChannelId ?? "",
            supportEmail: d.settings.supportEmail ?? "",
            geminiApiKey: d.settings.geminiApiKey ?? "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast("Settings saved successfully!");
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirm !== "RESET") return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setResetResult(data.deleted);
        setResetConfirm("");
        showToast("Platform data reset successfully!", "info");
      } else {
        showToast(data.error || "Reset failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Reset failed", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleVerifyKey = async () => {
    if (!settings.geminiApiKey?.trim()) {
      showToast("Masukkan API key terlebih dahulu", "error");
      return;
    }
    setVerifyingKey(true);
    setKeyStatus("idle");
    try {
      const res = await fetch("/api/admin/ai/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: settings.geminiApiKey }),
      });
      const data = await res.json();
      if (data.valid) {
        setKeyStatus("valid");
        showToast("✅ API key valid! AI Assistant siap digunakan.");
      } else {
        setKeyStatus("invalid");
        showToast(data.error || "API key tidak valid", "error");
      }
    } catch {
      setKeyStatus("invalid");
      showToast("Gagal memverifikasi API key", "error");
    } finally {
      setVerifyingKey(false);
    }
  };

  const handleCronCheck = async () => {
    try {
      showToast("Running view check...", "info");
      const r = await fetch("/api/cron/check-views?key=runeclipy-cron-2024");
      const d = await r.json();
      showToast(`Checked ${d.checked || 0} submissions`);
    } catch {
      showToast("Cron check failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="admin-shimmer h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card p-6"><div className="admin-shimmer h-32 w-full" /></div>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass-card p-6"><div className="admin-shimmer h-32 w-full" /></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="admin-page-header">
        <h1>Platform Settings</h1>
        <p>Configure platform behavior and credentials</p>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Financial */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold mb-2">💰 Financial</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Platform Fee (%)", key: "platformFeePercent" as const, min: 0, max: 50, step: 0.5 },
                { label: "Referral Commission (%)", key: "referralCommissionPercent" as const, min: 0, max: 50, step: 0.5 },
                { label: "Min Campaign WD ($)", key: "minCampaignWithdrawal" as const, min: 1, max: undefined, step: undefined },
                { label: "Min Referral WD ($)", key: "minReferralWithdrawal" as const, min: 1, max: undefined, step: undefined },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-text-secondary mb-1.5">{field.label}</label>
                  <input type="number" value={settings[field.key]}
                    onChange={(e) => setSettings({ ...settings, [field.key]: +e.target.value })}
                    className="input-field" min={field.min} max={field.max} step={field.step} />
                </div>
              ))}
            </div>
          </div>

          {/* General */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold mb-2">🌐 General</h3>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Support Email</label>
              <input type="email" value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="input-field" placeholder="support@runeclipy.com" />
            </div>
          </div>

          {/* Export Data */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-1">📤 Export Data</h3>
            <p className="text-xs text-text-muted mb-3">Download platform data (CSV)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "users", label: "👥 Users" },
                { type: "submissions", label: "🎬 Submissions" },
                { type: "transactions", label: "💸 Transactions" },
              ].map((e) => (
                <a key={e.type} href={`/api/admin/export?type=${e.type}`}
                  className="p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all text-center text-xs font-medium block">
                  {e.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <div className="glass-card p-6 space-y-4 !border-accent/20">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-lg border border-accent/20">
                🤖
              </span>
              <div>
                <h3 className="font-bold">AI Assistant</h3>
                <p className="text-[11px] text-text-muted">Google AI Studio (Gemini 2.0 Flash)</p>
              </div>
              {keyStatus === "valid" && (
                <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">● Connected</span>
              )}
              {keyStatus === "invalid" && (
                <span className="ml-auto text-[10px] font-semibold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">● Invalid Key</span>
              )}
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Google AI Studio API Key
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-accent-light text-[10px] underline underline-offset-2 hover:text-accent">
                  Dapatkan API Key →
                </a>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => {
                    setSettings({ ...settings, geminiApiKey: e.target.value });
                    setKeyStatus("idle");
                  }}
                  className="input-field flex-1 font-mono text-sm"
                  placeholder="AIza..."
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleVerifyKey}
                  disabled={verifyingKey || !settings.geminiApiKey?.trim()}
                  className={cn(
                    "admin-btn shrink-0 !px-4 !py-2 !text-xs transition-all",
                    keyStatus === "valid" ? "!border-emerald-400/30 !text-emerald-400" :
                    keyStatus === "invalid" ? "!border-red-400/30 !text-red-400" :
                    "admin-btn--accent"
                  )}
                >
                  {verifyingKey ? "⏳ Checking..." : keyStatus === "valid" ? "✅ Valid" : keyStatus === "invalid" ? "❌ Invalid" : "🔍 Verify"}
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                API key disimpan di database. Setelah save, AI bubble chat akan muncul di admin panel.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg-primary/40 border border-border/50 text-[11px] text-text-muted space-y-1">
              <div className="font-semibold text-text-secondary mb-1">🎯 Kemampuan AI Assistant:</div>
              <div>• Cari &amp; edit user (role, tier, balance, ban/unban)</div>
              <div>• Kelola campaign (status, budget, rates)</div>
              <div>• Approve / reject submission</div>
              <div>• Analisa statistik platform</div>
              <div>• Lihat transaksi &amp; activity log</div>
            </div>
          </div>

          {/* CRON / View Tracking */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-1">🔄 Auto View Tracking</h3>
            <p className="text-xs text-text-muted mb-3">
              Auto re-scrape views. Max 5/run, 1/user, 1 hour interval.
            </p>
            <div className="p-3 rounded-xl bg-bg-primary/50 border border-border space-y-1.5 text-xs">
              <div>
                <span className="text-text-muted">Endpoint: </span>
                <code className="text-accent-light text-[10px] font-mono">/api/cron/check-views?key=runeclipy-cron-2024</code>
              </div>
              <div>
                <span className="text-text-muted">Schedule: </span>
                <span>Every 10 minutes via Vercel Cron</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCronCheck}
              className="admin-btn admin-btn--accent mt-3"
            >
              🔄 Run Manual Check Now
            </button>
          </div>

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-2">🔗 Quick Links</h3>
            <p className="text-xs text-text-muted mb-3">Discord settings have moved to their own page.</p>
            <a href="/admin/discord"
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all text-sm font-medium">
              <span className="text-lg">💬</span>
              <div>
                <div className="font-semibold">Discord Hub</div>
                <div className="text-xs text-text-muted">Bot control, webhook, notifications, send messages</div>
              </div>
              <span className="ml-auto text-text-muted">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Save Button - Full Width */}
      <form onSubmit={handleSave} className="mt-6">
        <button type="submit" disabled={saving}
          className="btn-gradient w-full !rounded-xl !py-3.5 disabled:opacity-50 text-base font-semibold">
          {saving ? "⏳ Saving..." : "💾 Save Settings"}
        </button>
      </form>

      {/* Danger Zone - Full Width */}
      <div className="mt-8 glass-card p-6 !border-error/30">
        <h3 className="font-bold text-error mb-1">⚠️ Danger Zone</h3>
        <p className="text-sm text-text-muted mb-4">
          Reset all platform data. Deletes all users (except admins), campaigns, submissions, transactions, referrals, and notifications.
        </p>

        {resetResult ? (
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 mb-4">
            <p className="text-success font-bold text-sm mb-2">✅ Data reset successfully!</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
              {Object.entries(resetResult).map(([key, val]) => (
                <div key={key} className="flex justify-between bg-bg-primary/50 rounded-lg px-3 py-1.5">
                  <span className="capitalize">{key}</span>
                  <span className="text-text-primary font-mono font-bold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                Type <code className="text-error font-bold">RESET</code> to confirm
              </label>
              <input
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                className="input-field !border-error/30 focus:!border-error w-40 font-mono text-center tracking-widest"
                placeholder="RESET"
              />
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetConfirm !== "RESET" || resetting}
              className="admin-btn admin-btn--danger !py-2.5 !px-6 !text-sm"
            >
              {resetting ? "⏳ Resetting..." : "🗑️ Reset All Data"}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn("admin-toast",
          toast.type === "success" ? "admin-toast--success" :
          toast.type === "error" ? "admin-toast--error" :
          "admin-toast--info"
        )}>
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
