import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteSetting extends Document {
  // Financial
  platformFeePercent: number;
  minCampaignWithdrawal: number;
  minReferralWithdrawal: number;
  referralCommissionPercent: number;

  // Discord
  discordWebhookUrl: string;
  discordInviteUrl: string;
  discordNotifChannelId: string;
  discordMatrixChannelId?: string;
  discordChatChannelId?: string;
  enableDiscordAIChat?: boolean;
  discordBotToken?: string;
  discordGuildId?: string;

  // General
  siteName: string;
  supportEmail: string;
  weeklyLeaderboardSentAt?: Date | null;

  // AI Assistant
  geminiApiKey: string;
  geminiApiKeys: string[];
  geminiModel: string;

  updatedAt: Date;
}

const SiteSettingSchema = new Schema<ISiteSetting>(
  {
    // Financial
    platformFeePercent: { type: Number, default: 3 },
    minCampaignWithdrawal: { type: Number, default: 10 },
    minReferralWithdrawal: { type: Number, default: 30 },
    referralCommissionPercent: { type: Number, default: 5 },

    // Discord
    discordWebhookUrl: { type: String, default: "" },
    discordInviteUrl: { type: String, default: "https://discord.gg/runeclipy" },
    discordNotifChannelId: { type: String, default: "" },
    discordMatrixChannelId: { type: String, default: "" },
    discordChatChannelId: { type: String, default: "" },
    enableDiscordAIChat: { type: Boolean, default: false },
    discordBotToken: { type: String, default: "" },
    discordGuildId: { type: String, default: "" },

    // General
    siteName: { type: String, default: "RuneClipy" },
    supportEmail: { type: String, default: "" },
    weeklyLeaderboardSentAt: { type: Date, default: null },

    // AI Assistant
    geminiApiKey: { type: String, default: "" },
    geminiApiKeys: { type: [String], default: [] },
    geminiModel: { type: String, default: "gemini-2.0-flash" },
  },
  { timestamps: true }
);

const SiteSetting: Model<ISiteSetting> =
  mongoose.models.SiteSetting || mongoose.model<ISiteSetting>("SiteSetting", SiteSettingSchema);
export default SiteSetting;
