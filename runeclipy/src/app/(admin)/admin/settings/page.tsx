"use client";

import { useState, useEffect, useCallback } from "react";

interface Settings {
  platformFeePercent: number;
  minCampaignWithdrawal: number;
  minReferralWithdrawal: number;
  referralCommissionPercent: number;
  discordWebhookUrl: string;
  discordBotToken: string;
  discordGuildId: string;
  discordInviteUrl: string;
  supportEmail: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformFeePercent: 3, minCampaignWithdrawal: 10, minReferralWithdrawal: 30,
    referralCommissionPercent: 5, discordWebhookUrl: "", discordBotToken: "",
    discordGuildId: "", discordInviteUrl: "", supportEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<"success" | "fail" | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);

  // Discord Bot state
  const [bot, setBot] = useState<{
    status: string; error: string | null; startedAt: string | null;
    uptime: number; guildCount: number; ping: number;
    username: string | null; avatar: string | null;
  }>({ status: "offline", error: null, startedAt: null, uptime: 0, guildCount: 0, ping: 0, username: null, avatar: null });
  const [botLoading, setBotLoading] = useState(false);

  const fetchBotStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/discord-bot");
      const data = await res.json();
      if (data.success) setBot(data.bot);
    } catch { /* silent */ }
  }, []);

  // Poll bot status
  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  const handleBotToggle = async () => {
    setBotLoading(true);
    try {
      const action = bot.status === "online" ? "stop" : "start";
      const res = await fetch("/api/admin/discord-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.bot) setBot(data.bot);
      if (!data.success && data.error) alert(data.error);
    } catch (err) { console.error(err); }
    finally { setBotLoading(false); }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

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

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch("/api/admin/test-webhook", { method: "POST" });
      const data = await res.json();
      setWebhookTestResult(data.success ? "success" : "fail");
    } catch {
      setWebhookTestResult("fail");
    }
    setTestingWebhook(false);
    setTimeout(() => setWebhookTestResult(null), 4000);
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

  const maskToken = (token: string) => {
    if (!token || token.length < 12) return token;
    return token.substring(0, 6) + "••••••" + token.substring(token.length - 4);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">⚙️</div></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Platform Settings</h1>

      {/* ═══ Discord Bot Control ═══ */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${bot.status === "online" ? "bg-success animate-pulse" : bot.status === "connecting" ? "bg-warning animate-pulse" : "bg-text-muted"}`} />
            <h3 className="font-bold">🤖 Discord Bot</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              bot.status === "online" ? "bg-success/20 text-success" :
              bot.status === "connecting" ? "bg-warning/20 text-warning" :
              bot.status === "error" ? "bg-error/20 text-error" :
              "bg-bg-tertiary text-text-muted"
            }`}>
              {bot.status.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleBotToggle}
            disabled={botLoading || bot.status === "connecting"}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              bot.status === "online"
                ? "bg-error/20 text-error border border-error/30 hover:bg-error/30"
                : "bg-success/20 text-success border border-success/30 hover:bg-success/30"
            }`}
          >
            {botLoading ? "⏳" : bot.status === "online" ? "⏹ Stop Bot" : "▶ Start Bot"}
          </button>
        </div>

        {bot.status === "online" && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-center">
              <div className="text-xs text-text-muted mb-0.5">Bot</div>
              <div className="text-sm font-bold text-text-primary truncate">{bot.username || "—"}</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-center">
              <div className="text-xs text-text-muted mb-0.5">Uptime</div>
              <div className="text-sm font-bold text-success">{formatUptime(bot.uptime)}</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-center">
              <div className="text-xs text-text-muted mb-0.5">Ping</div>
              <div className="text-sm font-bold text-accent-light">{bot.ping}ms</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-center">
              <div className="text-xs text-text-muted mb-0.5">Servers</div>
              <div className="text-sm font-bold text-info">{bot.guildCount}</div>
            </div>
          </div>
        )}

        {bot.status === "error" && bot.error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
            ⚠️ {bot.error}
          </div>
        )}

        {bot.status === "offline" && !settings.discordBotToken && (
          <p className="text-xs text-text-muted">⚠️ Bot Token belum di-set. Isi di section bawah lalu Save dulu sebelum start bot.</p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ═══ Financial ═══ */}
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

        {/* ═══ Discord Bot Credentials ═══ */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">🤖 Discord Bot</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${settings.discordBotToken ? "bg-success/20 text-success" : "bg-bg-tertiary text-text-muted"}`}>
              {settings.discordBotToken ? "✓ Configured" : "Not Set"}
            </span>
          </div>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Create a bot at{" "}
            <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"
              className="text-accent-light hover:text-accent underline">Discord Developer Portal</a>
          </p>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Bot Token</label>
            <div className="relative">
              <input
                type={showBotToken ? "text" : "password"}
                value={showBotToken ? settings.discordBotToken : maskToken(settings.discordBotToken)}
                onChange={(e) => setSettings({ ...settings, discordBotToken: e.target.value })}
                onFocus={() => setShowBotToken(true)}
                className="input-field pr-20 font-mono text-xs"
                placeholder="MTIz...abc"
              />
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded bg-bg-tertiary"
              >
                {showBotToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Guild (Server) ID</label>
            <input
              type="text"
              value={settings.discordGuildId}
              onChange={(e) => setSettings({ ...settings, discordGuildId: e.target.value })}
              className="input-field font-mono text-xs"
              placeholder="123456789012345678"
            />
          </div>
        </div>

        {/* ═══ Discord Webhook ═══ */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">🔔 Discord Webhook</h3>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Webhook URL untuk notifikasi otomatis (submission baru, approval, payout, dll).
          </p>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Webhook URL</label>
            <input
              type="url"
              value={settings.discordWebhookUrl}
              onChange={(e) => setSettings({ ...settings, discordWebhookUrl: e.target.value })}
              className="input-field text-xs"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Discord Invite URL</label>
            <input
              type="url"
              value={settings.discordInviteUrl}
              onChange={(e) => setSettings({ ...settings, discordInviteUrl: e.target.value })}
              className="input-field text-xs"
              placeholder="https://discord.gg/runeclipy"
            />
          </div>

          {settings.discordWebhookUrl && (
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#5865F2]/20 text-[#5865F2] hover:bg-[#5865F2]/30 transition-all disabled:opacity-50"
            >
              {testingWebhook ? (
                <><span className="animate-spin">⏳</span> Sending...</>
              ) : webhookTestResult === "success" ? (
                <><span>✅</span> Test Sent!</>
              ) : webhookTestResult === "fail" ? (
                <><span>❌</span> Failed</>
              ) : (
                <><span>🧪</span> Test Webhook</>
              )}
            </button>
          )}
        </div>

        {/* ═══ General ═══ */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">🌐 General</h3>
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
