const express = require("express");
const cors = require("cors");
const path = require("path");
const { scrapeTikTokProfile } = require("./modules/tiktok-stalk");
const { scrapeTikTokVideo } = require("./modules/tiktok-video");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ═══════════════════════════════════════════════════════
//  API ROUTES — TikTok Profile Stalk
// ═══════════════════════════════════════════════════════

app.get("/api/tiktok/stalk/:username", async (req, res) => {
  const { username } = req.params;
  const cleanUsername = username.replace(/^@/, "").trim();

  if (!cleanUsername) {
    return res.status(400).json({
      success: false,
      error: "Username is required",
    });
  }

  try {
    console.log(`[RUNE] Stalking TikTok profile: @${cleanUsername}`);
    const profileData = await scrapeTikTokProfile(cleanUsername);

    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error(`[RUNE] Error stalking @${cleanUsername}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch profile data",
    });
  }
});

// ═══════════════════════════════════════════════════════
//  API ROUTES — TikTok Video Info
// ═══════════════════════════════════════════════════════

app.post("/api/tiktok/video", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({
      success: false,
      error: "Video URL or ID is required",
    });
  }

  try {
    console.log(`[RUNE] Fetching video info: ${url}`);
    const videoData = await scrapeTikTokVideo(url.trim());

    res.json({
      success: true,
      data: videoData,
    });
  } catch (error) {
    console.error(`[RUNE] Error fetching video:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch video data",
    });
  }
});

// Proxy avatar images to avoid CORS issues
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("URL required");

  try {
    const axios = require("axios");
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.tiktok.com/",
      },
      timeout: 10000,
    });
    res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(response.data));
  } catch {
    res.status(502).send("Failed to proxy image");
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🔮  PROJECT RUNE — CORE ENGINE      ║
  ║     ──────────────────────────────       ║
  ║     Server running on port ${PORT}          ║
  ║     http://localhost:${PORT}                ║
  ╚══════════════════════════════════════════╝
  `);
});
