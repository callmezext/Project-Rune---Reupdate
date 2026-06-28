const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const SiteSettingSchema = new mongoose.Schema({
  discordBotToken: String,
  discordGuildId: String,
});

const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema, "sitesettings");

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in env");
    process.exit(1);
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    console.error("DISCORD_BOT_TOKEN or DISCORD_GUILD_ID is not defined in VPS .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  let settings = await SiteSetting.findOne();
  if (!settings) {
    console.log("Creating new settings document...");
    settings = new SiteSetting({});
  }

  settings.discordBotToken = token;
  settings.discordGuildId = guildId;

  await settings.save();
  console.log("✅ Successfully synced Discord credentials from VPS .env to Database!");
  console.log("discordBotToken length:", settings.discordBotToken.length);
  console.log("discordGuildId:", settings.discordGuildId);

  mongoose.disconnect();
}

main().catch(console.error);
