import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteSetting extends Document {
  key: string;
  value: string;
  category: "payment" | "general" | "discord" | "referral";
  description: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SiteSettingSchema = new Schema<ISiteSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    category: { type: String, enum: ["payment", "general", "discord", "referral"], default: "general" },
    description: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Default settings to seed
export const DEFAULT_SETTINGS = [
  { key: "platform_fee_percent", value: "3", category: "payment", description: "Platform service fee on all withdrawals (%)" },
  { key: "min_campaign_withdraw", value: "10", category: "payment", description: "Minimum campaign balance withdrawal ($)" },
  { key: "min_referral_withdraw", value: "30", category: "payment", description: "Minimum referral balance withdrawal ($)" },
  { key: "referral_commission_percent", value: "5", category: "referral", description: "Referral commission on referred user earnings (%)" },
  { key: "discord_invite_url", value: "https://discord.gg/runeclipy", category: "discord", description: "Default Discord invite URL" },
  { key: "site_name", value: "RuneClipy", category: "general", description: "Website name" },
];

const SiteSetting: Model<ISiteSetting> =
  mongoose.models.SiteSetting || mongoose.model<ISiteSetting>("SiteSetting", SiteSettingSchema);
export default SiteSetting;
