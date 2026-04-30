import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICampaign extends Document {
  title: string;
  slug: string;
  coverImage: string;
  description: string; // Rich text HTML
  status: "active" | "paused" | "ended";
  type: "music" | "clipping" | "logo" | "ugc";
  supportedPlatforms: string[];

  // Budget & Rates
  totalBudget: number;
  budgetUsed: number;
  ratePerMillionViews: number;
  maxEarningsPerCreator: number;
  maxEarningsPerPost: number;
  maxSubmissionsPerAccount: number;

  // Requirements
  minViews: number;
  minLikes: number;
  contentType: "video" | "slide" | "both";

  // Video age restriction
  allowOldVideos: boolean;
  maxVideoAgeHours: number;

  // Earning type
  earningType: "per_view" | "per_post" | "both";
  fixedRatePerPost: number;

  // Auto-approve
  autoApprove: boolean;
  minEngagementRate: number;

  // Music/Sound
  sounds: {
    title: string;
    tiktokSoundId: string;
    soundUrl: string;
    videoReferenceUrl: string;
  }[];

  // Discord
  discordInviteUrl: string;

  // Stats (calculated)
  totalCreators: number;
  totalSubmissions: number;

  createdBy: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    coverImage: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "paused", "ended"], default: "active" },
    type: { type: String, enum: ["music", "clipping", "logo", "ugc"], default: "music" },
    supportedPlatforms: [{ type: String, default: "tiktok" }],

    totalBudget: { type: Number, required: true, default: 0 },
    budgetUsed: { type: Number, default: 0 },
    ratePerMillionViews: { type: Number, required: true, default: 1000 },
    maxEarningsPerCreator: { type: Number, default: 50 },
    maxEarningsPerPost: { type: Number, default: 25 },
    maxSubmissionsPerAccount: { type: Number, default: 3 },

    minViews: { type: Number, default: 1000 },
    minLikes: { type: Number, default: 0 },
    contentType: { type: String, enum: ["video", "slide", "both"], default: "both" },

    allowOldVideos: { type: Boolean, default: false },
    maxVideoAgeHours: { type: Number, default: 24 },

    earningType: { type: String, enum: ["per_view", "per_post", "both"], default: "per_view" },
    fixedRatePerPost: { type: Number, default: 0 },

    autoApprove: { type: Boolean, default: false },
    minEngagementRate: { type: Number, default: 2 },

    sounds: [
      {
        title: String,
        tiktokSoundId: String,
        soundUrl: String,
        videoReferenceUrl: String,
      },
    ],

    discordInviteUrl: { type: String, default: "" },

    totalCreators: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

CampaignSchema.index({ status: 1, type: 1 });
CampaignSchema.index({ slug: 1 });

const Campaign: Model<ICampaign> = mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);
export default Campaign;
