// ═══════════════════════════════════════
// RuneClipy — Notification Helper
// Create in-app notifications for users
// ═══════════════════════════════════════

import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";

interface CreateNotifOptions {
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  link?: string;
}

export async function createNotification(opts: CreateNotifOptions) {
  try {
    await connectDB();
    await Notification.create({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      icon: opts.icon || getIcon(opts.type),
      link: opts.link,
    });
  } catch (err) {
    console.error("Create notification error:", err);
  }
}

export async function createBulkNotifications(userIds: string[], opts: Omit<CreateNotifOptions, "userId">) {
  try {
    await connectDB();
    const docs = userIds.map((userId) => ({
      userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      icon: opts.icon || getIcon(opts.type),
      link: opts.link,
    }));
    await Notification.insertMany(docs);
  } catch (err) {
    console.error("Bulk notification error:", err);
  }
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    submission_approved: "✅",
    submission_rejected: "❌",
    payout_completed: "💸",
    payout_rejected: "⚠️",
    new_campaign: "🎵",
    campaign_ended: "🏁",
    new_referral: "👥",
    system: "🔮",
  };
  return icons[type] || "🔔";
}
