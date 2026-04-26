# 🔮 Project Rune — TikTok Intelligence Suite

> TikTok Profile Stalk & Video Info Tool built with Node.js + Puppeteer

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-23+-40B5A4?logo=puppeteer&logoColor=white)

## ✨ Features

### 👤 Profile Stalk
- Username, Nickname, Bio, Avatar
- Follower / Following / Like / Video counts
- Verified status, Private account flag
- Region info

### 🎬 Video Info
- Video ID, Description, Creation Date
- Author info (username, nickname, UID, avatar)
- Views, Likes, Comments, Shares, Bookmarks
- Video duration, resolution, cover image
- Music/Sound info (title, artist, duration)
- Hashtags, Location, Ad detection

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/callmezext/Tiktok-Tools-Stalk-Video-.git
cd Tiktok-Tools-Stalk-Video-

# Install dependencies
npm install

# Run the server
node server.js

# Open in browser
# http://localhost:3000
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tiktok/stalk/:username` | Stalk TikTok profile |
| `POST` | `/api/tiktok/video` | Get video info (body: `{ "url": "..." }`) |
| `GET` | `/api/proxy-image?url=...` | Proxy image (CORS bypass) |

## 🧠 How It Works

Uses **Puppeteer** (headless Chromium) with 3-tier extraction strategy:

1. `__UNIVERSAL_DATA_FOR_REHYDRATION__` — Parse JSON from script tag (most reliable)
2. `SIGI_STATE` — Legacy TikTok JSON format (fallback)
3. **DOM Scraping** — Direct element extraction using `data-e2e` selectors (last resort)

## 📁 Project Structure

```
├── server.js                 # Express server + API routes
├── modules/
│   ├── tiktok-stalk.js       # Profile scraper module
│   └── tiktok-video.js       # Video info scraper module
└── public/
    ├── index.html            # Frontend UI
    ├── style.css             # Dark glassmorphism theme
    └── app.js                # Frontend logic
```

## ⚠️ Disclaimer

This tool is for **educational purposes only**. Scraping TikTok may violate their Terms of Service. Use responsibly.

## 📄 License

MIT License — feel free to use and modify.

---

Built with 🔮 by **Project Rune**
