"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface DiscordEmbed {
  id: string; title: string; description: string; color: number;
  thumbnail?: { url: string }; image?: { url: string };
  footer?: { text: string; icon_url?: string }; content?: string;
}
interface Channel { id: string; name: string; }
interface DiscordSettings { discordWebhookUrl: string; discordInviteUrl: string; discordNotifChannelId: string; }
type Toast = { message: string; type: "success"|"error"|"info" } | null;

interface DiscordUser {
  _id: string;
  nickname: string;
  username: string;
  email: string;
  role: string;
  tier: string;
  discordId?: string;
  discordUsername?: string;
  lastTierSynced?: string;
  isBanned: boolean;
}

const COLORS = [
  { name: "Blurple", hex: "#5865F2", val: 0x5865F2 },
  { name: "Green", hex: "#57F287", val: 0x57F287 },
  { name: "Yellow", hex: "#FEE75C", val: 0xFEE75C },
  { name: "Fuchsia", hex: "#EB459E", val: 0xEB459E },
  { name: "Red", hex: "#ED4245", val: 0xED4245 },
  { name: "White", hex: "#FFFFFF", val: 0xFFFFFF },
  { name: "Black", hex: "#23272A", val: 0x23272A },
  { name: "Aqua", hex: "#00D4AA", val: 0x00D4AA },
  { name: "Purple", hex: "#9B59B6", val: 0x9B59B6 },
  { name: "Orange", hex: "#E67E22", val: 0xE67E22 },
  { name: "Blue", hex: "#3498DB", val: 0x3498DB },
  { name: "Pink", hex: "#FF6B9D", val: 0xFF6B9D },
];

function newEmbed(): DiscordEmbed {
  return { id: Math.random().toString(36).slice(2), title: "", description: "", color: 0x5865F2, content: "" };
}

function parseDiscordMarkdown(text: string): string {
  if (!text) return "";

  // 1. Escape HTML tags to prevent injection
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 2. Code blocks: ```code```
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-[#2f3136] border border-white/5 p-2 rounded font-mono text-[11px] text-[#dcddde] whitespace-pre overflow-x-auto my-1.5">$1</pre>');

  // 3. Inline Code: `code`
  html = html.replace(/`([^`]+?)`/g, '<code class="bg-[#2f3136] px-1 py-0.5 rounded font-mono text-[11px] text-[#e06c75]">$1</code>');

  // 4. Spoilers: ||spoiler||
  html = html.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="discord-spoiler">$1</span>');

  // 5. Bold: **text**
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

  // 6. Underline: __text__
  html = html.replace(/__([\s\S]+?)__/g, '<span class="underline">$1</span>');

  // 7. Italic: *text* or _text_
  html = html.replace(/\*([\s\S]+?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([\s\S]+?)_/g, '<em class="italic">$1</em>');

  // 8. Strikethrough: ~~text~~
  html = html.replace(/~~([\s\S]+?)~~/g, '<del class="line-through opacity-60">$1</del>');

  // 9. Headers & Quotes (line-by-line)
  const lines = html.split("\n");
  const processedLines = lines.map(line => {
    if (line.startsWith("# ")) {
      return `<h1 class="text-base font-bold text-white my-1">${line.substring(2)}</h1>`;
    }
    if (line.startsWith("## ")) {
      return `<h2 class="text-sm font-bold text-white my-1">${line.substring(3)}</h2>`;
    }
    if (line.startsWith("### ")) {
      return `<h3 class="text-xs font-bold text-white my-1">${line.substring(4)}</h3>`;
    }
    if (line.startsWith("&gt; ")) {
      return `<blockquote class="border-l-4 border-[#4f545c] pl-2.5 my-1 text-[#b9bbbe] italic">${line.substring(5)}</blockquote>`;
    }
    return line;
  });
  html = processedLines.join("\n");

  return html;
}

export default function AdminDiscordPage() {
  const [activeTab, setActiveTab] = useState<"bot"|"send"|"guide"|"users">("bot");

  // ── User Roles & Sync state ────────────────────────────────────────
  const [discordUsers, setDiscordUsers] = useState<DiscordUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  // Edit modal for user roles
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<DiscordUser | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({
    role: "user",
    tier: "bronze",
    discordId: "",
    discordUsername: "",
  });
  const [editRoleSubmitting, setEditRoleSubmitting] = useState(false);
  const [editRoleError, setEditRoleError] = useState<string | null>(null);

  // Channel state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState("");

  // Bot state
  const [bot, setBot] = useState<{
    status: string; error: string | null; startedAt: string | null;
    uptime: number; guildCount: number; ping: number;
    username: string | null; avatar: string | null;
  }>({ status: "offline", error: null, startedAt: null, uptime: 0, guildCount: 0, ping: 0, username: null, avatar: null });
  const [botLoading, setBotLoading] = useState(false);

  // Discord settings
  const [discordSettings, setDiscordSettings] = useState<DiscordSettings>({
    discordWebhookUrl: "", discordInviteUrl: "", discordNotifChannelId: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<"success" | "fail" | null>(null);

  // Embed builder
  const [selectedChannel, setSelectedChannel] = useState("");
  const [embeds, setEmbeds] = useState<DiscordEmbed[]>([newEmbed()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [customColor, setCustomColor] = useState("#5865F2");
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((message: string, type: "success"|"error"|"info" = "success") => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000);
  }, []);

  // Load discord-linked users
  const loadDiscordUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const r = await fetch("/api/admin/users");
      const d = await r.json();
      if (d.success) setDiscordUsers(d.users);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setUsersLoading(false);
    }
  }, [showToast]);

  // Compute sync status for a user
  const getSyncStatus = (user: DiscordUser): "synced" | "pending" | "unlinked" => {
    if (!user.discordId) return "unlinked";
    if (user.lastTierSynced !== user.tier) return "pending";
    return "synced";
  };

  // Open edit role modal
  const openEditRole = (user: DiscordUser) => {
    setEditRoleUser(user);
    setEditRoleForm({
      role: user.role || "user",
      tier: user.tier || "bronze",
      discordId: user.discordId || "",
      discordUsername: user.discordUsername || "",
    });
    setEditRoleError(null);
    setEditRoleOpen(true);
  };

  // Submit edit role modal
  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleUser) return;
    setEditRoleSubmitting(true);
    setEditRoleError(null);
    try {
      const res = await fetch(`/api/admin/users/${editRoleUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRoleForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscordUsers(prev => prev.map(u =>
          u._id === editRoleUser._id ? { ...u, ...editRoleForm, lastTierSynced: "" } : u
        ));
        showToast("User updated! Bot will sync roles shortly.");
        setEditRoleOpen(false);
      } else {
        setEditRoleError(data.error || "Failed to update user");
      }
    } catch {
      setEditRoleError("Network error");
    } finally {
      setEditRoleSubmitting(false);
    }
  };

  // Force sync: clear lastTierSynced
  const handleForceSync = async (user: DiscordUser) => {
    if (!user.discordId) return showToast("User has no Discord linked", "error");
    setUserActionLoading(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastTierSynced: "" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscordUsers(prev => prev.map(u =>
          u._id === user._id ? { ...u, lastTierSynced: "" } : u
        ));
        showToast("Sync queued! Bot will update Discord role shortly.", "info");
      } else {
        showToast(data.error || "Failed to queue sync", "error");
      }
    } catch {
      showToast("Request failed", "error");
    } finally {
      setUserActionLoading(null);
    }
  };

  // Unlink Discord from user
  const handleUnlinkDiscord = async (user: DiscordUser) => {
    if (!confirm(`Unlink Discord from @${user.username}?`)) return;
    setUserActionLoading(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: "", discordUsername: "" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscordUsers(prev => prev.map(u =>
          u._id === user._id ? { ...u, discordId: "", discordUsername: "", lastTierSynced: "" } : u
        ));
        showToast(`Discord unlinked from @${user.username}`);
      } else {
        showToast(data.error || "Failed to unlink", "error");
      }
    } catch {
      showToast("Request failed", "error");
    } finally {
      setUserActionLoading(null);
    }
  };

  // Fetch channels
  useEffect(() => {
    fetch("/api/admin/discord-channels").then(r => r.json()).then(d => {
      if (d.success) { setChannels(d.channels); setChannelError(""); }
      else setChannelError(d.error || "Failed to load channels");
    }).catch(() => setChannelError("Failed to load channels")).finally(() => setLoadingChannels(false));
  }, []);

  // Fetch discord settings
  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      if (d.success && d.settings) {
        setDiscordSettings({
          discordWebhookUrl: d.settings.discordWebhookUrl || "",
          discordInviteUrl: d.settings.discordInviteUrl || "",
          discordNotifChannelId: d.settings.discordNotifChannelId || "",
        });
      }
    }).catch(console.error);
  }, []);

  // Bot status polling
  const fetchBotStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/discord-bot");
      const data = await res.json();
      if (data.success) setBot(data.bot);
    } catch { /* silent */ }
  }, []);

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.bot) setBot(data.bot);
      if (!data.success && data.error) showToast(data.error, "error");
      else showToast(`Bot ${action === "start" ? "starting..." : "stopped"}`, action === "start" ? "info" : "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle bot", "error");
    } finally { setBotLoading(false); }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Save discord settings
  const handleSaveDiscordSettings = async () => {
    setSavingSettings(true);
    try {
      const cur = await fetch("/api/admin/settings").then(r => r.json());
      const merged = { ...(cur.settings || {}), ...discordSettings };
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      if (res.ok) showToast("Discord settings saved!");
      else showToast("Failed to save", "error");
    } catch { showToast("Failed to save", "error"); }
    finally { setSavingSettings(false); }
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

  // Embed helpers
  const active = embeds[activeIdx] || embeds[0];
  const updateActive = (fields: Partial<DiscordEmbed>) => {
    setEmbeds(prev => prev.map((e, i) => i === activeIdx ? { ...e, ...fields } : e));
  };
  const addEmbed = () => {
    if (embeds.length >= 5) return showToast("Max 5 embeds", "info");
    setEmbeds(prev => [...prev, newEmbed()]);
    setActiveIdx(embeds.length);
  };
  const removeEmbed = (idx: number) => {
    if (embeds.length <= 1) return;
    setEmbeds(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, activeIdx - 1));
  };
  const insertFormat = (before: string, after: string) => {
    const ta = descRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const text = active.description;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    updateActive({ description: newText });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, end + before.length); }, 0);
  };
  const handleSend = async () => {
    if (!selectedChannel) return showToast("Pilih channel dulu!", "error");
    if (!embeds.some(e => e.title || e.description)) return showToast("Minimal isi title atau description!", "error");
    setSending(true);
    try {
      const payload = embeds.map(e => {
        const embed: Record<string, unknown> = { title: e.title || undefined, description: e.description || undefined, color: e.color };
        if (e.thumbnail?.url) embed.thumbnail = { url: e.thumbnail.url };
        if (e.image?.url) embed.image = { url: e.image.url };
        if (e.footer?.text) embed.footer = { text: e.footer.text, icon_url: e.footer.icon_url || undefined };
        if (e.content) embed.content = e.content;
        return embed;
      });
      const res = await fetch("/api/admin/discord-send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannel, embeds: payload }),
      });
      const data = await res.json();
      if (data.success) showToast(`✅ ${data.results.length} pesan terkirim!`);
      else showToast(data.error || "Gagal mengirim", "error");
    } catch { showToast("Gagal mengirim", "error"); }
    finally { setSending(false); }
  };

  const formatBtns = [
    { label: "B", title: "Bold", b: "**", a: "**" },
    { label: "I", title: "Italic", b: "*", a: "*" },
    { label: "U", title: "Underline", b: "__", a: "__" },
    { label: "S", title: "Strikethrough", b: "~~", a: "~~" },
    { label: "||", title: "Spoiler", b: "||", a: "||" },
    { label: "<>", title: "Code", b: "`", a: "`" },
    { label: "```", title: "Code Block", b: "```\n", a: "\n```" },
    { label: ">", title: "Quote", b: "> ", a: "" },
    { label: "H1", title: "Header 1", b: "# ", a: "" },
    { label: "H2", title: "Header 2", b: "## ", a: "" },
    { label: "H3", title: "Header 3", b: "### ", a: "" },
  ];

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("discord-spoiler")) {
      target.classList.toggle("revealed");
    }
  };

  const tabs = [
    { id: "bot" as const, label: "Bot & Settings", icon: "🤖" },
    { id: "send" as const, label: "Send Message", icon: "📤" },
    { id: "users" as const, label: "User Roles & Sync", icon: "👥" },
    { id: "guide" as const, label: "Format Guide", icon: "📝" },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="admin-page-header">
        <div className="flex items-center gap-3">
          <h1>Discord Hub</h1>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
            bot.status === "online" ? "bg-success/20 text-success" :
            bot.status === "connecting" ? "bg-warning/20 text-warning" :
            bot.status === "error" ? "bg-error/20 text-error" :
            "bg-bg-tertiary text-text-muted"
          )}>
            <div className={cn("w-2 h-2 rounded-full",
              bot.status === "online" ? "bg-success animate-pulse" :
              bot.status === "connecting" ? "bg-warning animate-pulse" :
              "bg-text-muted"
            )} />
            {bot.status.toUpperCase()}
          </div>
        </div>
        <p>Manage bot, notifications, webhook, and send messages</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-bg-secondary/50 p-1 rounded-xl flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => {
            setActiveTab(tab.id);
            if (tab.id === "users" && discordUsers.length === 0) loadDiscordUsers();
          }}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              activeTab === tab.id ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
            )}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Bot & Settings ═══ */}
      {activeTab === "bot" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Bot Control */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">🤖 Bot Control</h3>
                <button type="button" onClick={handleBotToggle}
                  disabled={botLoading || bot.status === "connecting"}
                  className={cn("admin-btn", bot.status === "online" ? "admin-btn--danger" : "admin-btn--success")}>
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
            </div>

            {/* Notification Channel */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold">📢 Notification Channel</h3>
              <p className="text-xs text-text-muted -mt-2">
                Select channel for automatic new campaign notifications.
              </p>
              {loadingChannels ? (
                <div className="admin-shimmer h-10 w-full rounded-lg" />
              ) : channelError ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
                    ⚠️ {channelError}
                  </div>
                  <select disabled className="input-field text-xs opacity-50 cursor-not-allowed">
                    <option>— Channels unavailable —</option>
                  </select>
                </div>
              ) : (
                <select value={discordSettings.discordNotifChannelId}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, discordNotifChannelId: e.target.value })}
                  className="input-field text-xs">
                  <option value="">— Disable Auto Notifications —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Webhook */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold">🔔 Webhook</h3>
              <p className="text-xs text-text-muted -mt-2">
                Webhook URL for automatic notifications (submissions, approvals, payouts, etc).
              </p>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Webhook URL</label>
                <input type="url" value={discordSettings.discordWebhookUrl}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, discordWebhookUrl: e.target.value })}
                  className="input-field text-xs" placeholder="https://discord.com/api/webhooks/..." />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Discord Invite URL</label>
                <input type="url" value={discordSettings.discordInviteUrl}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, discordInviteUrl: e.target.value })}
                  className="input-field text-xs" placeholder="https://discord.gg/runeclipy" />
              </div>

              {discordSettings.discordWebhookUrl && (
                <button type="button" onClick={handleTestWebhook} disabled={testingWebhook}
                  className="admin-btn admin-btn--accent">
                  {testingWebhook ? (<>⏳ Sending...</>) :
                   webhookTestResult === "success" ? (<>✅ Test Sent!</>) :
                   webhookTestResult === "fail" ? (<>❌ Failed</>) :
                   (<>🧪 Test Webhook</>)}
                </button>
              )}
            </div>

            {/* Environment Info */}
            <div className="glass-card p-6">
              <h3 className="font-bold mb-2">🔧 Configuration</h3>
              <p className="text-xs text-text-muted mb-3">
                Bot token & Guild ID are configured via environment variables on the server.
              </p>
              <div className="p-3 rounded-xl bg-bg-primary/50 border border-border space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">DISCORD_BOT_TOKEN:</span>
                  <span className={bot.status === "online" ? "text-success" : "text-error"}>●</span>
                  <span className="text-text-secondary">{bot.status === "online" ? "Configured" : "Not configured / Bot offline"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">DISCORD_GUILD_ID:</span>
                  <span className={channels.length > 0 ? "text-success" : "text-error"}>●</span>
                  <span className="text-text-secondary">{channels.length > 0 ? "Configured" : channelError || "Not configured"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="lg:col-span-2">
            <button onClick={handleSaveDiscordSettings} disabled={savingSettings}
              className="btn-gradient w-full !rounded-xl !py-3 disabled:opacity-50 text-base font-semibold">
              {savingSettings ? "⏳ Saving..." : "💾 Save Discord Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: Send Message ═══ */}
      {activeTab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Channel Select */}
            <div className="glass-card p-4">
              <label className="block text-sm font-semibold mb-2">📺 Channel</label>
              {loadingChannels ? (
                <div className="admin-shimmer h-10 w-full rounded-lg" />
              ) : channelError ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs">⚠️ {channelError}</div>
                  <select disabled className="input-field opacity-50 cursor-not-allowed"><option>— No channels available —</option></select>
                </div>
              ) : (
                <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)}
                  className="input-field" id="discord-channel-select">
                  <option value="">— Pilih Channel —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Embed Builder */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {embeds.map((e, i) => (
                  <button key={e.id} onClick={() => setActiveIdx(i)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      i === activeIdx ? "bg-accent text-white" : "bg-bg-tertiary text-text-muted hover:text-text-primary"
                    )}>
                    Embed {i + 1}
                    {embeds.length > 1 && (
                      <span onClick={(ev) => { ev.stopPropagation(); removeEmbed(i); }}
                        className="ml-1.5 text-[10px] hover:text-error cursor-pointer">✕</span>
                    )}
                  </button>
                ))}
                <button onClick={addEmbed} className="px-3 py-1.5 rounded-lg text-xs bg-bg-tertiary text-text-muted hover:text-accent transition-all">+ Add</button>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-text-muted mb-1">💬 Content (text biasa, opsional)</label>
                <input type="text" value={active.content || ""} onChange={e => updateActive({ content: e.target.value })}
                  className="input-field text-sm" placeholder="Pesan text biasa di atas embed..." />
              </div>

              <div className="mb-3">
                <label className="block text-xs text-text-muted mb-1">📝 Title</label>
                <input type="text" value={active.title} onChange={e => updateActive({ title: e.target.value })}
                  className="input-field text-sm font-semibold" placeholder="Judul embed..." />
              </div>

              <div className="flex items-center gap-1 mb-1 flex-wrap">
                {formatBtns.map(f => (
                  <button key={f.label} title={f.title} onClick={() => insertFormat(f.b, f.a)}
                    className="px-2 py-1 rounded text-xs font-mono bg-bg-tertiary hover:bg-accent/20 hover:text-accent transition-all">{f.label}</button>
                ))}
              </div>

              <div className="mb-3">
                <label className="block text-xs text-text-muted mb-1">📄 Description</label>
                <textarea ref={descRef} value={active.description} onChange={e => updateActive({ description: e.target.value })}
                  className="input-field text-sm min-h-[120px] resize-y font-mono" placeholder="Isi pesan... (support markdown)" />
              </div>

              <div className="mb-3">
                <label className="block text-xs text-text-muted mb-2">🎨 Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c.val} title={c.name} onClick={() => { updateActive({ color: c.val }); setCustomColor(c.hex); }}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                        active.color === c.val ? "border-white scale-110" : "border-transparent"
                      )} style={{ backgroundColor: c.hex }} />
                  ))}
                  <input type="color" value={customColor} onChange={e => {
                    setCustomColor(e.target.value);
                    updateActive({ color: parseInt(e.target.value.replace("#", ""), 16) });
                  }} className="w-7 h-7 rounded cursor-pointer" title="Custom color" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">🖼️ Thumbnail URL</label>
                  <input type="url" value={active.thumbnail?.url || ""} onChange={e => updateActive({ thumbnail: { url: e.target.value } })}
                    className="input-field text-xs" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">🏞️ Image URL</label>
                  <input type="url" value={active.image?.url || ""} onChange={e => updateActive({ image: { url: e.target.value } })}
                    className="input-field text-xs" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">🔻 Footer</label>
                <input type="text" value={active.footer?.text || ""} onChange={e => updateActive({ footer: { ...active.footer, text: e.target.value } })}
                  className="input-field text-xs" placeholder="Footer text..." />
              </div>
            </div>

            <button onClick={handleSend} disabled={sending || !selectedChannel}
              className="btn-gradient w-full !rounded-xl !py-3 disabled:opacity-50 text-base font-semibold" id="discord-send-btn">
              {sending ? "⏳ Mengirim..." : "📤 Kirim ke Discord"}
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-bold mb-3">👁️ Preview</h3>
              <style>{`
                .discord-spoiler {
                  background-color: #202225;
                  color: #202225;
                  cursor: pointer;
                  border-radius: 3px;
                  padding: 0 3px;
                  user-select: none;
                }
                .discord-spoiler.revealed {
                  color: #dcddde !important;
                  background-color: rgba(255, 255, 255, 0.1) !important;
                  user-select: text;
                }
              `}</style>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#36393f" }} onClick={handlePreviewClick}>
                {embeds.map((emb, i) => (
                  <div key={emb.id} className={cn("p-4", i > 0 && "border-t border-white/5")}>
                    {emb.content && <p className="text-sm mb-2" style={{ color: "#dcddde" }}>{emb.content}</p>}
                    <div className="flex rounded" style={{ borderLeft: `4px solid #${emb.color.toString(16).padStart(6, "0")}` }}>
                      <div className="flex-1 p-3">
                        {emb.title && (
                          <p
                            className="font-bold text-sm mb-1"
                            style={{ color: "#ffffff" }}
                            dangerouslySetInnerHTML={{ __html: parseDiscordMarkdown(emb.title) }}
                          />
                        )}
                        {emb.description && (
                          <div
                            className="text-xs whitespace-pre-wrap"
                            style={{ color: "#dcddde" }}
                            dangerouslySetInnerHTML={{ __html: parseDiscordMarkdown(emb.description) }}
                          />
                        )}
                        {emb.image?.url && (
                          <div className="mt-2 rounded overflow-hidden max-w-[300px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={emb.image.url} alt="embed" className="w-full h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        {emb.footer?.text && <p className="text-[10px] mt-2" style={{ color: "#72767d" }}>{emb.footer.text}</p>}
                      </div>
                      {emb.thumbnail?.url && (
                        <div className="p-3 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={emb.thumbnail.url} alt="thumb" className="w-16 h-16 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: User Roles & Sync ═══ */}
      {activeTab === "users" && (() => {
        const TIER_COLORS: Record<string, string> = {
          bronze: "text-amber-600",
          silver: "text-slate-300",
          gold: "text-yellow-400",
          diamond: "text-cyan-300",
        };
        const TIER_EMOJI: Record<string, string> = {
          bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎",
        };
        const ROLE_COLORS: Record<string, string> = {
          admin: "bg-error/15 text-error",
          moderator: "bg-info/15 text-info",
          user: "bg-white/5 text-text-secondary",
        };
        const filteredUsers = discordUsers.filter(u =>
          !userSearch ||
          u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.nickname || "").toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.discordUsername || "").toLowerCase().includes(userSearch.toLowerCase())
        );
        const linkedCount = discordUsers.filter(u => u.discordId).length;
        const pendingCount = discordUsers.filter(u => u.discordId && u.lastTierSynced !== u.tier).length;

        return (
          <div className="animate-fadeIn">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total Users", value: discordUsers.length, color: "text-text-primary", icon: "👥" },
                { label: "Discord Linked", value: linkedCount, color: "text-success", icon: "🔗" },
                { label: "Pending Sync", value: pendingCount, color: "text-warning", icon: "⏳" },
                { label: "Not Linked", value: discordUsers.length - linkedCount, color: "text-text-muted", icon: "⚠️" },
              ].map(stat => (
                <div key={stat.label} className="glass-card p-4 text-center border border-white/[0.04]">
                  <div className="text-lg mb-0.5">{stat.icon}</div>
                  <div className={cn("text-xl font-black font-mono", stat.color)}>{stat.value}</div>
                  <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search + Refresh */}
            <div className="flex gap-3 mb-5">
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="🔍 Search by username, nickname, email, or Discord..."
                className="input-field flex-1"
              />
              <button
                onClick={loadDiscordUsers}
                disabled={usersLoading}
                className="admin-btn admin-btn--ghost !px-4 flex-shrink-0"
              >
                {usersLoading ? "⏳" : "🔄"} Refresh
              </button>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="admin-shimmer h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-text-secondary text-sm">
                  {userSearch ? `No users matching "${userSearch}"` : "No users found"}
                </p>
              </div>
            ) : (
              <>
                {/* ── Mobile Cards ── */}
                <div className="space-y-3 md:hidden">
                  {filteredUsers.map(u => {
                    const syncStatus = getSyncStatus(u);
                    const isDisabled = userActionLoading === u._id;
                    return (
                      <div key={u._id} className="glass-card p-4 border border-white/[0.04] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-white">{u.nickname || u.username}</div>
                            <div className="text-[11px] text-accent-light font-mono">@{u.username}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("badge text-[9px] font-extrabold px-2 py-0.5", ROLE_COLORS[u.role] || ROLE_COLORS.user)}>{u.role}</span>
                            <span className={cn("text-[10px] font-bold", TIER_COLORS[u.tier] || "text-text-muted")}>{TIER_EMOJI[u.tier] || ""} {u.tier}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          {u.discordId ? (
                            <>
                              <span className="text-[#5865F2] font-bold">🎮 @{u.discordUsername || u.discordId}</span>
                              <span className="text-text-muted font-mono text-[10px] truncate">{u.discordId}</span>
                            </>
                          ) : (
                            <span className="text-text-muted italic">No Discord linked</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            syncStatus === "synced" ? "bg-success/15 text-success" :
                            syncStatus === "pending" ? "bg-warning/15 text-warning" :
                            "bg-text-muted/15 text-text-muted"
                          )}>
                            {syncStatus === "synced" ? "✅ Synced" : syncStatus === "pending" ? "⏳ Pending Sync" : "⚠️ Not Linked"}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => openEditRole(u)} disabled={isDisabled}
                            className="admin-btn admin-btn--accent flex-1 !text-[11px] !py-1.5">✏️ Edit</button>
                          {u.discordId && (
                            <button onClick={() => handleForceSync(u)} disabled={isDisabled}
                              className="admin-btn admin-btn--ghost flex-1 !text-[11px] !py-1.5">
                              {isDisabled ? "⏳" : "🔄 Sync"}
                            </button>
                          )}
                          {u.discordId && (
                            <button onClick={() => handleUnlinkDiscord(u)} disabled={isDisabled}
                              className="admin-btn admin-btn--danger !px-3 !text-[11px] !py-1.5">🔓</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Desktop Table ── */}
                <div className="glass-card overflow-hidden hidden md:block border border-white/[0.04]">
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th className="text-center">Web Role</th>
                          <th className="text-center">Discord Tier</th>
                          <th>Discord Account</th>
                          <th className="text-center">Sync Status</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => {
                          const syncStatus = getSyncStatus(u);
                          const isDisabled = userActionLoading === u._id;
                          return (
                            <tr key={u._id} className={cn(
                              "hover:bg-white/[0.015] transition-colors duration-200",
                              u.isBanned && "opacity-50"
                            )}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                                    {(u.nickname || u.username).charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-white">{u.nickname || u.username}</div>
                                    <div className="text-[11px] text-accent-light font-mono">@{u.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className={cn("badge text-[9.5px] font-extrabold px-2.5 py-0.5", ROLE_COLORS[u.role] || ROLE_COLORS.user)}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className={cn("text-sm font-bold", TIER_COLORS[u.tier] || "text-text-muted")}>
                                  {TIER_EMOJI[u.tier] || ""} {u.tier || "bronze"}
                                </span>
                              </td>
                              <td>
                                {u.discordId ? (
                                  <div>
                                    <div className="text-[#7289da] text-sm font-semibold">
                                      🎮 @{u.discordUsername || "—"}
                                    </div>
                                    <div className="text-text-muted font-mono text-[10px]">{u.discordId}</div>
                                  </div>
                                ) : (
                                  <span className="text-text-muted italic text-xs">Not linked</span>
                                )}
                              </td>
                              <td className="text-center">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                                  syncStatus === "synced" ? "bg-success/15 text-success" :
                                  syncStatus === "pending" ? "bg-warning/15 text-warning" :
                                  "bg-white/5 text-text-muted"
                                )}>
                                  {syncStatus === "synced" ? "✅ Synced" : syncStatus === "pending" ? "⏳ Pending" : "⚠️ Not Linked"}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="flex gap-1.5 justify-center">
                                  <button onClick={() => openEditRole(u)} disabled={isDisabled}
                                    className="admin-btn admin-btn--accent !py-1.5 !px-3 !text-[11px] font-bold">✏️ Edit</button>
                                  {u.discordId && (
                                    <button onClick={() => handleForceSync(u)} disabled={isDisabled}
                                      className="admin-btn admin-btn--ghost !py-1.5 !px-3 !text-[11px] font-bold">
                                      {isDisabled ? "⏳" : "🔄"}
                                    </button>
                                  )}
                                  {u.discordId && (
                                    <button onClick={() => handleUnlinkDiscord(u)} disabled={isDisabled}
                                      className="admin-btn admin-btn--danger !py-1.5 !px-2.5 !text-[11px]" title="Unlink Discord">🔓</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Edit Role Modal ── */}
            {editRoleOpen && editRoleUser && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
                <div className="fixed inset-0 bg-[#000]/70 backdrop-blur-sm" onClick={() => setEditRoleOpen(false)} />
                <div className="relative z-10 glass-card w-full max-w-md p-7 border border-indigo-500/30 bg-[#0f0b24]/95 animate-fadeIn">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-base font-black text-white flex-shrink-0">
                      {(editRoleUser.nickname || editRoleUser.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white leading-tight">Edit User Roles</h2>
                      <p className="text-[11px] text-text-muted">@{editRoleUser.username} • {editRoleUser.email}</p>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.06] my-5" />

                  <form onSubmit={handleEditRoleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-text-secondary font-bold">Web Role</label>
                        <select
                          value={editRoleForm.role}
                          onChange={e => setEditRoleForm(p => ({ ...p, role: e.target.value }))}
                          className="input-field !py-2.5 !text-sm"
                        >
                          <option value="user">👤 User</option>
                          <option value="moderator">🛡️ Moderator</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-text-secondary font-bold">Discord Tier</label>
                        <select
                          value={editRoleForm.tier}
                          onChange={e => setEditRoleForm(p => ({ ...p, tier: e.target.value }))}
                          className="input-field !py-2.5 !text-sm"
                        >
                          <option value="bronze">🥉 Bronze</option>
                          <option value="silver">🥈 Silver</option>
                          <option value="gold">🥇 Gold</option>
                          <option value="diamond">💎 Diamond</option>
                        </select>
                      </div>
                    </div>

                    <div className="h-px bg-white/[0.04]" />
                    <p className="text-[11px] text-text-muted -mt-1">Discord Account Linking</p>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-text-secondary font-bold">Discord User ID</label>
                      <input
                        type="text"
                        value={editRoleForm.discordId}
                        onChange={e => setEditRoleForm(p => ({ ...p, discordId: e.target.value }))}
                        placeholder="e.g. 123456789012345678"
                        className="input-field !py-2.5 !text-sm font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-text-secondary font-bold">Discord Username</label>
                      <input
                        type="text"
                        value={editRoleForm.discordUsername}
                        onChange={e => setEditRoleForm(p => ({ ...p, discordUsername: e.target.value }))}
                        placeholder="e.g. username#1234"
                        className="input-field !py-2.5 !text-sm"
                      />
                    </div>

                    {editRoleForm.discordId && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                        <span className="text-base flex-shrink-0">ℹ️</span>
                        <span>Saving will set sync status to <strong>Pending</strong>. The Discord bot will automatically assign the <strong>{editRoleForm.tier}</strong> tier role within ~30 seconds.</span>
                      </div>
                    )}

                    {editRoleError && (
                      <div className="error-message">
                        <span>❌</span><span>{editRoleError}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setEditRoleOpen(false)} className="admin-btn admin-btn--ghost flex-1">
                        Cancel
                      </button>
                      <button type="submit" disabled={editRoleSubmitting} className="admin-btn admin-btn--accent flex-1">
                        {editRoleSubmitting ? "⏳ Saving..." : "💾 Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ TAB: Format Guide ═══ */}
      {activeTab === "guide" && (
        <div className="max-w-2xl">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">📝 Discord Markdown Format Guide</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["**bold**", "bold"],
                ["*italic*", "italic"],
                ["__underline__", "underline"],
                ["~~strikethrough~~", "strikethrough"],
                ["||spoiler||", "spoiler"],
                ["`code`", "code"],
                ["```code block```", "code block"],
                ["> quote", "quote"],
              ].map(([syntax, label]) => (
                <div key={label} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-primary/50 border border-border">
                  <code className="text-accent-light text-xs font-mono bg-bg-tertiary px-2 py-1 rounded">{syntax}</code>
                  <span className="text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={cn("admin-toast",
          toast.type === "success" ? "admin-toast--success" : toast.type === "error" ? "admin-toast--error" : "admin-toast--info"
        )}>
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
