const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

// Define schema locally to avoid path issues
const SiteSettingSchema = new mongoose.Schema({
  discordWebhookUrl: String,
  discordInviteUrl: String,
  discordNotifChannelId: String,
  discordMatrixChannelId: String,
  discordChatChannelId: String,
  enableDiscordAIChat: Boolean,
  discordBotToken: String,
  discordGuildId: String,
  discordCampaignColor: String,
  discordCampaignLayout: String,
  discordCampaignPing: String,
  discordCampaignTitle: String,
});

const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema, "sitesettings");

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not defined in env");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const settings = await SiteSetting.findOne();
  if (!settings) {
    console.log("No site settings found!");
  } else {
    console.log("--- Site Settings ---");
    console.log("discordWebhookUrl:", settings.discordWebhookUrl);
    console.log("discordInviteUrl:", settings.discordInviteUrl);
    console.log("discordNotifChannelId:", settings.discordNotifChannelId);
    console.log("discordMatrixChannelId:", settings.discordMatrixChannelId);
    console.log("discordChatChannelId:", settings.discordChatChannelId);
    console.log("discordBotToken length:", settings.discordBotToken ? settings.discordBotToken.length : 0);
    console.log("discordGuildId:", settings.discordGuildId);
    console.log("discordCampaignColor:", settings.discordCampaignColor);
    console.log("discordCampaignLayout:", settings.discordCampaignLayout);
    console.log("discordCampaignPing:", settings.discordCampaignPing);
    console.log("discordCampaignTitle:", settings.discordCampaignTitle);
  }
  mongoose.disconnect();
}

main().catch(console.error);
