const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const ActivityLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  action: String,
  details: String,
  ip: String,
  createdAt: Date,
});

const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema, "activitylogs");

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log("Connected to DB");

  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(20).lean();
  console.log("--- Activity Logs (last 20) ---");
  logs.forEach(log => {
    console.log(`[${log.createdAt.toISOString()}] Action: ${log.action} | Details: ${log.details}`);
  });

  mongoose.disconnect();
}

main().catch(console.error);
