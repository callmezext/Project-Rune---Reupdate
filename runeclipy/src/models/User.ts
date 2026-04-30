import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  nickname: string;
  username: string;
  email: string;
  password: string;
  googleId?: string;
  discordId?: string;
  role: "user" | "admin";
  avatar?: string;
  memberSince: Date;
  referredBy?: string;
  referralCode: string;
  paymentMethods: {
    type: "paypal" | "dana";
    email?: string;
    phone?: string;
    nickname?: string;
    isDefault: boolean;
  }[];
  stats: {
    totalVideos: number;
    totalEarned: number;
    totalViews: number;
  };
  campaignBalance: number;
  referralBalance: number;
  isBanned: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nickname: { type: String, required: true, trim: true, maxlength: 30 },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 20 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, default: "" },
    googleId: { type: String, sparse: true },
    discordId: { type: String, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },
    memberSince: { type: Date, default: Date.now },
    referredBy: { type: String, default: "" },
    referralCode: { type: String, unique: true },
    paymentMethods: [
      {
        type: { type: String, enum: ["paypal", "dana"], required: true },
        email: String,
        phone: String,
        nickname: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    stats: {
      totalVideos: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
    },
    campaignBalance: { type: Number, default: 0 },
    referralBalance: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ referralCode: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
