const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

// Local schema
const SiteSettingSchema = new mongoose.Schema({
  discordBotToken: String,
  discordGuildId: String,
});
const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema, "sitesettings");

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log("Connected to DB");

  const settings = await SiteSetting.findOne();
  const token = settings.discordBotToken;
  console.log("Token length:", token ? token.length : 0);

  // Get first text channel of the guild
  const guildId = settings.discordGuildId;
  const channelRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!channelRes.ok) {
    console.error("Failed to fetch channels:", await channelRes.text());
    process.exit(1);
  }
  const channels = await channelRes.json();
  const textChannels = channels.filter(c => c.type === 0);
  if (textChannels.length === 0) {
    console.error("No text channels found in guild");
    process.exit(1);
  }
  const targetChannel = textChannels[0];
  console.log(`Targeting channel: #${targetChannel.name} (${targetChannel.id})`);

  // Build the payload with buttons
  const embed = {
    title: "Test Embed",
    description: "This is a test description",
    color: 0x5865F2,
    buttons: [
      { label: "Google", url: "https://google.com" }
    ]
  };

  const payload = { embeds: [embed] };
  if (embed.buttons && embed.buttons.length > 0) {
    payload.components = [
      {
        type: 1,
        components: embed.buttons.map(b => ({
          type: 2,
          style: 5,
          label: b.label,
          url: b.url
        }))
      }
    ];
    delete embed.buttons;
  }

  console.log("Payload:", JSON.stringify(payload, null, 2));

  // Send request to Discord API
  const sendRes = await fetch(`https://discord.com/api/v10/channels/${targetChannel.id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("Status:", sendRes.status);
  console.log("Response:", await sendRes.text());

  mongoose.disconnect();
}

main().catch(console.error);
