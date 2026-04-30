/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — Discord Bot Manager (Singleton)
 *  Start/stop from admin dashboard. Works in local dev & VPS.
 *  NOTE: Does NOT work on Vercel serverless (no persistent process).
 * ═══════════════════════════════════════════════════════════
 */

import { Client, GatewayIntentBits, Events, ActivityType } from "discord.js";

interface BotState {
  client: Client | null;
  status: "offline" | "connecting" | "online" | "error";
  error: string | null;
  startedAt: Date | null;
  guildCount: number;
  ping: number;
}

// Global singleton so it persists across hot reloads in dev
const globalBot = globalThis as unknown as { __discordBot?: BotState };

function getState(): BotState {
  if (!globalBot.__discordBot) {
    globalBot.__discordBot = {
      client: null,
      status: "offline",
      error: null,
      startedAt: null,
      guildCount: 0,
      ping: 0,
    };
  }
  return globalBot.__discordBot;
}

export function getBotStatus() {
  const state = getState();
  return {
    status: state.status,
    error: state.error,
    startedAt: state.startedAt?.toISOString() || null,
    uptime: state.startedAt ? Math.floor((Date.now() - state.startedAt.getTime()) / 1000) : 0,
    guildCount: state.guildCount,
    ping: state.client?.ws.ping ?? 0,
    username: state.client?.user?.tag || null,
    avatar: state.client?.user?.displayAvatarURL() || null,
  };
}

export async function startBot(token: string): Promise<{ success: boolean; error?: string }> {
  const state = getState();

  if (state.status === "online" || state.status === "connecting") {
    return { success: false, error: "Bot is already running" };
  }

  if (!token) {
    return { success: false, error: "No bot token provided" };
  }

  state.status = "connecting";
  state.error = null;

  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    // Ready event
    client.once(Events.ClientReady, (c) => {
      console.log(`[Discord Bot] ✅ Online as ${c.user.tag} — ${c.guilds.cache.size} servers`);
      state.status = "online";
      state.startedAt = new Date();
      state.guildCount = c.guilds.cache.size;

      c.user.setActivity("RuneClipy 🔮", { type: ActivityType.Watching });
    });

    // Error handling
    client.on(Events.Error, (err) => {
      console.error("[Discord Bot] Error:", err.message);
      state.error = err.message;
    });

    client.on(Events.ShardDisconnect, () => {
      console.warn("[Discord Bot] Disconnected");
      state.status = "offline";
      state.startedAt = null;
    });

    await client.login(token);
    state.client = client;

    return { success: true };
  } catch (err) {
    const msg = (err as Error).message || "Failed to start bot";
    console.error("[Discord Bot] Start failed:", msg);
    state.status = "error";
    state.error = msg;
    state.client = null;
    return { success: false, error: msg };
  }
}

export async function stopBot(): Promise<{ success: boolean }> {
  const state = getState();

  if (!state.client || state.status === "offline") {
    state.status = "offline";
    return { success: true };
  }

  try {
    state.client.destroy();
    console.log("[Discord Bot] 🔴 Stopped");
  } catch (err) {
    console.error("[Discord Bot] Stop error:", (err as Error).message);
  }

  state.client = null;
  state.status = "offline";
  state.error = null;
  state.startedAt = null;
  state.guildCount = 0;

  return { success: true };
}
