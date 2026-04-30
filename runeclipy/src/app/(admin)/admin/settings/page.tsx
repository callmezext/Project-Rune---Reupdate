"use client";

import { useState, useEffect } from "react";

interface Settings {
  platformFeePercent: number;
  minCampaignWithdrawal: number;
  minReferralWithdrawal: number;
  referralCommissionPercent: number;
  discordBotInvite: string;
  mainDiscordUrl: string;
  supportEmail: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformFeePercent: 3, minCampaignWithdrawal: 10, minReferralWithdrawal: 30,
    referralCommissionPercent: 5, discordBotInvite: "", mainDiscordUrl: "", supportEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.settings) setSettings(d.settings); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
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
      } else {
        alert(data.error || "Reset failed");
      }
    } catch (err) {
      console.error(err);
      alert("Reset failed");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">⚙️</div></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Platform Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💰 Financial</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Platform Fee (%)</label>
              <input type="number" value={settings.platformFeePercent}
                onChange={(e) => setSettings({ ...settings, platformFeePercent: +e.target.value })}
                className="input-field" min={0} max={50} step={0.5} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Referral Commission (%)</label>
              <input type="number" value={settings.referralCommissionPercent}
                onChange={(e) => setSettings({ ...settings, referralCommissionPercent: +e.target.value })}
                className="input-field" min={0} max={50} step={0.5} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Min Campaign Withdrawal ($)</label>
              <input type="number" value={settings.minCampaignWithdrawal}
                onChange={(e) => setSettings({ ...settings, minCampaignWithdrawal: +e.target.value })}
                className="input-field" min={1} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Min Referral Withdrawal ($)</label>
              <input type="number" value={settings.minReferralWithdrawal}
                onChange={(e) => setSettings({ ...settings, minReferralWithdrawal: +e.target.value })}
                className="input-field" min={1} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💬 Discord & Support</h3>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Discord Bot Invite URL</label>
            <input type="url" value={settings.discordBotInvite}
              onChange={(e) => setSettings({ ...settings, discordBotInvite: e.target.value })}
              className="input-field" placeholder="https://discord.com/api/oauth2/..." />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Main Discord Server URL</label>
            <input type="url" value={settings.mainDiscordUrl}
              onChange={(e) => setSettings({ ...settings, mainDiscordUrl: e.target.value })}
              className="input-field" placeholder="https://discord.gg/..." />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Support Email</label>
            <input type="email" value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="input-field" placeholder="support@runeclipy.com" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-gradient w-full !rounded-xl !py-3 disabled:opacity-50">
          {saving ? "Saving..." : saved ? "✅ Saved!" : "💾 Save Settings"}
        </button>
      </form>

      {/* ═══ EXPORT DATA ═══ */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-bold mb-1">📤 Export Data</h3>
        <p className="text-sm text-text-muted mb-4">Download data platform dalam format CSV/Excel</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { type: "users", label: "👥 Users", desc: "Semua user data" },
            { type: "submissions", label: "🎬 Submissions", desc: "Video & stats" },
            { type: "transactions", label: "💸 Transactions", desc: "Payouts & earnings" },
          ].map((e) => (
            <a key={e.type} href={`/api/admin/export?type=${e.type}`}
              className="p-4 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all text-center group cursor-pointer block">
              <div className="text-xl mb-1">{e.label.slice(0, 2)}</div>
              <div className="text-xs font-medium">{e.label.slice(3)}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{e.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ═══ CRON / VIEW TRACKING ═══ */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-bold mb-1">🔄 Auto View Tracking</h3>
        <p className="text-sm text-text-muted mb-4">
          Re-scrape views submission secara otomatis. Staggered: max 5 submissions per run, 1 per user, jarak 1 jam.
        </p>
        <div className="p-4 rounded-xl bg-bg-primary/50 border border-border space-y-2">
          <div className="text-xs">
            <span className="text-text-muted">Cron Endpoint:</span>{" "}
            <code className="text-accent-light text-[11px]">/api/cron/check-views?key=runeclipy-cron-2024</code>
          </div>
          <div className="text-xs">
            <span className="text-text-muted">Recommended:</span>{" "}
            <span>Panggil setiap 10 menit via Vercel Cron atau external cron service.</span>
          </div>
          <div className="text-xs">
            <span className="text-text-muted">Vercel cron config (vercel.json):</span>
          </div>
          <pre className="text-[10px] bg-bg-tertiary p-2 rounded-lg overflow-x-auto text-text-secondary">
{`{
  "crons": [{
    "path": "/api/cron/check-views?key=runeclipy-cron-2024",
    "schedule": "*/10 * * * *"
  }]
}`}
          </pre>
        </div>
        <button
          onClick={async () => {
            const r = await fetch("/api/cron/check-views?key=runeclipy-cron-2024");
            const d = await r.json();
            alert(`Checked: ${d.checked || 0} submissions`);
          }}
          className="mt-3 px-4 py-2 rounded-xl text-xs font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition-all"
        >
          🔄 Run Manual Check Now
        </button>
      </div>

      {/* ═══ DANGER ZONE ═══ */}
      <div className="mt-12 glass-card p-6 !border-error/30">
        <h3 className="font-bold text-error mb-1">⚠️ Danger Zone</h3>
        <p className="text-sm text-text-muted mb-4">
          Reset semua data platform. Menghapus semua users (kecuali admin), campaigns, submissions, transactions, referrals, dan notifications.
        </p>

        {resetResult ? (
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 mb-4">
            <p className="text-success font-bold text-sm mb-2">✅ Data berhasil di-reset!</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
              {Object.entries(resetResult).map(([key, val]) => (
                <div key={key} className="flex justify-between bg-bg-primary/50 rounded-lg px-3 py-1.5">
                  <span className="capitalize">{key}</span>
                  <span className="text-text-primary font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                Ketik <code className="text-error font-bold">RESET</code> untuk konfirmasi
              </label>
              <input
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                className="input-field !border-error/30 focus:!border-error max-w-xs font-mono text-center tracking-widest"
                placeholder="Ketik RESET"
              />
            </div>
            <button
              onClick={handleReset}
              disabled={resetConfirm !== "RESET" || resetting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-error/20 text-error border border-error/30 hover:bg-error/30 hover:border-error/50"
            >
              {resetting ? "⏳ Resetting..." : "🗑️ Reset All Data"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

