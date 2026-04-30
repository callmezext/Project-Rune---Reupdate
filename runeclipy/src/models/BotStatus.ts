import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBotStatus extends Document {
  botType: "discord";
  /** Admin sets: "start" | "stop" | "restart" */
  command: "start" | "stop" | "restart" | "idle";
  /** Bot writes its current state */
  status: "offline" | "connecting" | "online" | "error";
  error: string;
  username: string;
  avatar: string;
  guildCount: number;
  ping: number;
  startedAt: Date | null;
  lastHeartbeat: Date | null;
  updatedAt: Date;
}

const BotStatusSchema = new Schema<IBotStatus>(
  {
    botType: { type: String, default: "discord", unique: true },
    command: { type: String, enum: ["start", "stop", "restart", "idle"], default: "idle" },
    status: { type: String, enum: ["offline", "connecting", "online", "error"], default: "offline" },
    error: { type: String, default: "" },
    username: { type: String, default: "" },
    avatar: { type: String, default: "" },
    guildCount: { type: Number, default: 0 },
    ping: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    lastHeartbeat: { type: Date, default: null },
  },
  { timestamps: true }
);

const BotStatus: Model<IBotStatus> =
  mongoose.models.BotStatus || mongoose.model<IBotStatus>("BotStatus", BotStatusSchema);
export default BotStatus;
