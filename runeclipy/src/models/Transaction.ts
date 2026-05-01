import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "campaign_earning" | "referral_earning" | "payout" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "rejected";
  paymentMethod?: { type: string; email?: string; phone?: string };
  paymentFee: number;
  netAmount: number;
  campaignId?: mongoose.Types.ObjectId;
  submissionId?: mongoose.Types.ObjectId;
  referralId?: mongoose.Types.ObjectId;
  description: string;
  processedAt?: Date;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["campaign_earning", "referral_earning", "payout", "refund"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: ["pending", "completed", "failed", "rejected"], default: "pending" },
    paymentMethod: {
      type: { type: String },
      email: String,
      phone: String,
    },
    paymentFee: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission" },
    referralId: { type: Schema.Types.ObjectId, ref: "Referral" },
    description: { type: String, default: "" },
    processedAt: Date,
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
