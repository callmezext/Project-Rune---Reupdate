/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — Discord Webhook Notifications
 * ═══════════════════════════════════════════════════════════
 */

import axios from "axios";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

async function sendWebhook(content: string, embeds?: DiscordEmbed[]) {
  if (!WEBHOOK_URL) return;
  try {
    await axios.post(WEBHOOK_URL, { content, embeds }, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
  } catch (err) {
    console.error("[Discord] Webhook failed:", (err as Error).message);
  }
}

// ─── Notification helpers ────────────────────────────────

export async function notifyNewSubmission(data: {
  userName: string; campaignTitle: string; videoUrl: string;
  views: number; soundMatch: string; autoApproved: boolean;
}) {
  await sendWebhook("", [{
    title: data.autoApproved ? "🤖 Auto-Approved Submission" : "📥 New Submission",
    color: data.autoApproved ? 0x22c55e : 0x6366f1,
    fields: [
      { name: "Creator", value: `@${data.userName}`, inline: true },
      { name: "Campaign", value: data.campaignTitle, inline: true },
      { name: "Views", value: data.views.toLocaleString(), inline: true },
      { name: "Sound", value: data.soundMatch || "N/A", inline: true },
      { name: "Video", value: data.videoUrl },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifySubmissionReview(data: {
  userName: string; campaignTitle: string; status: string;
  earned: number; reason?: string;
}) {
  const isApproved = data.status === "approved";
  await sendWebhook("", [{
    title: isApproved ? "✅ Submission Approved" : "❌ Submission Rejected",
    color: isApproved ? 0x22c55e : 0xef4444,
    fields: [
      { name: "Creator", value: `@${data.userName}`, inline: true },
      { name: "Campaign", value: data.campaignTitle, inline: true },
      ...(isApproved ? [{ name: "Earned", value: `$${data.earned.toFixed(2)}`, inline: true }] : []),
      ...(data.reason ? [{ name: "Reason", value: data.reason }] : []),
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyNewUser(username: string, email: string) {
  await sendWebhook("", [{
    title: "👤 New User Registered",
    color: 0x3b82f6,
    fields: [
      { name: "Username", value: `@${username}`, inline: true },
      { name: "Email", value: email, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyPayoutRequest(data: {
  userName: string; amount: number; method: string; netAmount: number;
}) {
  await sendWebhook("", [{
    title: "💸 Payout Request",
    color: 0xf59e0b,
    fields: [
      { name: "Creator", value: `@${data.userName}`, inline: true },
      { name: "Amount", value: `$${data.amount.toFixed(2)}`, inline: true },
      { name: "Net", value: `$${data.netAmount.toFixed(2)}`, inline: true },
      { name: "Method", value: data.method, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyCampaignBudgetLow(title: string, budgetUsed: number, totalBudget: number) {
  const pct = Math.round((budgetUsed / totalBudget) * 100);
  await sendWebhook(`⚠️ Campaign budget alert!`, [{
    title: "🔴 Budget Almost Full",
    color: 0xef4444,
    fields: [
      { name: "Campaign", value: title },
      { name: "Used", value: `$${budgetUsed.toFixed(2)} / $${totalBudget.toFixed(2)} (${pct}%)` },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
