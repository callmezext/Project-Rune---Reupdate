import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubmission extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  connectedAccountId: mongoose.Types.ObjectId;
  videoUrl: string;
  tiktokVideoId: string;
  soundId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  earned: number;
  status: "pending" | "approved" | "rejected" | "paid_out";
  rejectReason: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    connectedAccountId: { type: Schema.Types.ObjectId, ref: "ConnectedAccount" },
    videoUrl: { type: String, required: true },
    tiktokVideoId: { type: String, default: "" },
    soundId: { type: String, default: "" },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    earned: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected", "paid_out"], default: "pending" },
    rejectReason: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    submittedAt: { type: Date, default: Date.now },
    lastCheckedAt: Date,
  },
  { timestamps: true }
);

SubmissionSchema.index({ campaignId: 1, userId: 1 });
SubmissionSchema.index({ userId: 1, status: 1 });

const Submission: Model<ISubmission> = mongoose.models.Submission || mongoose.model<ISubmission>("Submission", SubmissionSchema);
export default Submission;
