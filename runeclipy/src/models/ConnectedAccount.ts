import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConnectedAccount extends Document {
  userId: mongoose.Types.ObjectId;
  platform: "tiktok";
  username: string;
  profileUrl: string;
  verificationCode: string;
  isVerified: boolean;
  verifiedAt?: Date;
  connectedAt: Date;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    platform: { type: String, enum: ["tiktok"], default: "tiktok" },
    username: { type: String, required: true, trim: true },
    profileUrl: { type: String, required: true },
    verificationCode: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConnectedAccountSchema.index({ userId: 1, platform: 1 });

const ConnectedAccount: Model<IConnectedAccount> =
  mongoose.models.ConnectedAccount || mongoose.model<IConnectedAccount>("ConnectedAccount", ConnectedAccountSchema);
export default ConnectedAccount;
