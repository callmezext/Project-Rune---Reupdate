import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredUserId: mongoose.Types.ObjectId;
  referredUsername: string;
  referrerUsername: string;
  totalEarned: number;
  joinedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referredUsername: { type: String, required: true },
    referrerUsername: { type: String, required: true },
    totalEarned: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ReferralSchema.index({ referrerId: 1 });

const Referral: Model<IReferral> = mongoose.models.Referral || mongoose.model<IReferral>("Referral", ReferralSchema);
export default Referral;
