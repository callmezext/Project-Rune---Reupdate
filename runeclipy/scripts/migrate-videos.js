 const fs = require("fs");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const axios = require("axios");

// Parse .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
let mongodbUri = "";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match) mongodbUri = match[1].trim();
}

if (!mongodbUri) {
  console.error("Error: MONGODB_URI not found in .env.local");
  process.exit(1);
}

// Define Campaign Schema inline so we don't have to deal with TS models compiling
const CampaignSchema = new mongoose.Schema({
  title: String,
  sounds: [
    {
      title: String,
      soundUrl: String,
      videoReferenceUrl: String,
      tiktokSoundId: String,
    }
  ]
}, { collection: "campaigns" });

const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);

function getRandomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

async function downloadReferenceVideo(videoUrl) {
  if (videoUrl.startsWith("/uploads/")) {
    return videoUrl;
  }

  const response = await axios.post(
    "https://www.tikwm.com/api/",
    `url=${encodeURIComponent(videoUrl)}&hd=1`,
    {
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000,
    }
  );

  const d = response.data;
  if (d?.code !== 0) throw new Error(d?.msg || "TikWM API error");
  const data = d?.data;
  if (!data) throw new Error("No data in TikWM response");

  const videoId = data.id || `video-${Date.now()}`;
  const playUrl = data.play || data.hdplay;
  if (!playUrl) throw new Error("No play URL found in response");

  const publicDir = path.join(__dirname, "..", "public");
  const uploadsDir = path.join(publicDir, "uploads", "reference-videos");
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${videoId}.mp4`;
  const filePath = path.join(uploadsDir, fileName);
  const publicPath = `/uploads/reference-videos/${fileName}`;

  const writer = fs.createWriteStream(filePath);
  const downloadResponse = await axios({
    url: playUrl,
    method: 'GET',
    responseType: 'stream'
  });

  downloadResponse.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(publicPath));
    writer.on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongodbUri);
    console.log("Connected successfully!");

    const campaigns = await Campaign.find();
    console.log(`Found ${campaigns.length} campaigns. Starting migration...`);

    let migratedCount = 0;

    for (const campaign of campaigns) {
      let isModified = false;
      if (campaign.sounds && campaign.sounds.length > 0) {
        for (const sound of campaign.sounds) {
          if (sound.videoReferenceUrl && sound.videoReferenceUrl.trim().startsWith("http")) {
            try {
              console.log(`\n[Migration] Downloading reference video for: "${campaign.title}" -> "${sound.title}"`);
              console.log(`Source URL: ${sound.videoReferenceUrl}`);
              const localUrl = await downloadReferenceVideo(sound.videoReferenceUrl);
              sound.videoReferenceUrl = localUrl;
              isModified = true;
              migratedCount++;
              console.log(`Local Path: ${localUrl}`);
            } catch (err) {
              console.error(`Failed to download reference video for "${campaign.title}":`, err.message);
            }
          }
        }
      }
      if (isModified) {
        await campaign.save();
        console.log(`Saved campaign: "${campaign.title}"`);
      }
    }

    console.log(`\nMigration completed! Successfully migrated ${migratedCount} videos.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.connect(mongodbUri).then(async () => {
      await mongoose.disconnect();
    });
    console.log("Disconnected from MongoDB.");
  }
}

run();
