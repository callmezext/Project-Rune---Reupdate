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
  siteLogoUrl: string;
  supportEmail: string;
  weeklyLeaderboardSentAt?: Date | null;

  // AI Assistant
  geminiApiKey: string;
  geminiApiKeys: string[];
  geminiModel: string;

  // Discord Announcement Customizations
  discordCampaignColor?: string;
  discordCampaignLayout?: "image_top" | "image_bottom" | "thumbnail" | "no_image";
  discordCampaignPing?: string;
  discordCampaignTitle?: string;
  discordApprovedColor?: string;
  discordRejectedColor?: string;

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

    // Discord Announcement Customizations
    discordCampaignColor: { type: String, default: "#00D4AA" },
    discordCampaignLayout: { type: String, default: "image_bottom" },
    discordCampaignPing: { type: String, default: "🎉 **Campaign Baru!** @everyone" },
    discordCampaignTitle: { type: String, default: "🎵 New Campaign!" },
    discordApprovedColor: { type: String, default: "#2ECC71" },
    discordRejectedColor: { type: String, default: "#ED4245" },

    // General
    siteName: { type: String, default: "RuneClipy" },
    siteLogoUrl: { type: String, default: "" },
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
