"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

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

type Toast = { message: string; type: "success" | "error" | "info" } | null;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformFeePercent: 3, minCampaignWithdrawal: 10, minReferralWithdrawal: 30,
    referralCommissionPercent: 5, discordWebhookUrl: "", discordBotToken: "",
    discordGuildId: "", discordInviteUrl: "", supportEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<"success" | "fail" | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  // Discord Bot state
  const [bot, setBot] = useState<{
    status: string; error: string | null; startedAt: string | null;
    uptime: number; guildCount: number; ping: number;
    username: string | null; avatar: string | null;
  }>({ status: "offline", error: null, startedAt: null, uptime: 0, guildCount: 0, ping: 0, username: null, avatar: null });
  const [botLoading, setBotLoading] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
      if (!data.success && data.error) showToast(data.error, "error");
      else showToast(`Bot ${action === "start" ? "starting..." : "stopped"}`, action === "start" ? "info" : "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle bot", "error");
    } finally {
      setBotLoading(false);
    }
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

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch("/api/admin/test-webhook", { method: "POST" });
      const data = await res.json();
      setWebhookTestResult(data.success ? "success" : "fail");
      showToast(data.success ? "Webhook test sent!" : "Webhook test failed", data.success ? "success" : "error");
    } catch {
      setWebhookTestResult("fail");
      showToast("Webhook test failed", "error");
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

  const maskToken = (token: string) => {
    if (!token || token.length < 12) return token;
    return token.substring(0, 6) + "••••••" + token.substring(token.length - 4);
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
            {Array.from({ length: 3 }).map((_, i) => (
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
        <p>Configure platform behavior, integrations, and credentials</p>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Discord Bot Control */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full",
                  bot.status === "online" ? "bg-success animate-pulse" :
                  bot.status === "connecting" ? "bg-warning animate-pulse" :
                  "bg-text-muted"
                )} />
                <h3 className="font-bold">🤖 Discord Bot</h3>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  bot.status === "online" ? "bg-success/20 text-success" :
                  bot.status === "connecting" ? "bg-warning/20 text-warning" :
                  bot.status === "error" ? "bg-error/20 text-error" :
                  "bg-bg-tertiary text-text-muted"
                )}>
                  {bot.status.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBotToggle}
                disabled={botLoading || bot.status === "connecting"}
                className={cn("admin-btn",
                  bot.status === "online" ? "admin-btn--danger" : "admin-btn--success"
                )}
              >
                {botLoading ? "⏳" : bot.status === "online" ? "⏹ Stop" : "▶ Start"}
              </button>
            </div>

            {bot.status === "online" && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Bot", value: bot.username || "—", color: "text-text-primary" },
                  { label: "Uptime", value: formatUptime(bot.uptime), color: "text-success" },
                  { label: "Ping", value: `${bot.ping}ms`, color: "text-accent-light" },
                  { label: "Servers", value: bot.guildCount.toString(), color: "text-info" },
                ].map((stat) => (
                  <div key={stat.label} className="p-2.5 rounded-xl bg-bg-primary/50 border border-border text-center">
                    <div className="text-[10px] text-text-muted">{stat.label}</div>
                    <div className={cn("text-xs font-bold truncate", stat.color)}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {bot.status === "error" && bot.error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
                ⚠️ {bot.error}
              </div>
            )}

            {bot.status === "offline" && !settings.discordBotToken && (
              <p className="text-xs text-text-muted">⚠️ Bot Token not set. Configure it in Discord Bot Config section.</p>
            )}
          </div>

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
          {/* Discord Bot Credentials */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">🤖 Discord Bot Config</h3>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                settings.discordBotToken ? "bg-success/20 text-success" : "bg-bg-tertiary text-text-muted"
              )}>
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded bg-bg-tertiary transition-colors"
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

          {/* Discord Webhook */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold mb-2">🔔 Discord Webhook</h3>
            <p className="text-xs text-text-muted -mt-2 mb-3">
              Webhook URL for automatic notifications (submissions, approvals, payouts, etc).
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
                className="admin-btn admin-btn--accent"
              >
                {testingWebhook ? (
                  <>⏳ Sending...</>
                ) : webhookTestResult === "success" ? (
                  <>✅ Test Sent!</>
                ) : webhookTestResult === "fail" ? (
                  <>❌ Failed</>
                ) : (
                  <>🧪 Test Webhook</>
                )}
              </button>
            )}
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
