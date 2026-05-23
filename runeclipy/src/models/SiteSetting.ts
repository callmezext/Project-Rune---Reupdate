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

  // General
  siteName: string;
  supportEmail: string;

  // AI Assistant
  geminiApiKey: string;
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

    // General
    siteName: { type: String, default: "RuneClipy" },
    supportEmail: { type: String, default: "" },

    // AI Assistant
    geminiApiKey: { type: String, default: "" },
    geminiModel: { type: String, default: "gemini-2.0-flash" },
  },
  { timestamps: true }
);

const SiteSetting: Model<ISiteSetting> =
  mongoose.models.SiteSetting || mongoose.model<ISiteSetting>("SiteSetting", SiteSettingSchema);
export default SiteSetting;
