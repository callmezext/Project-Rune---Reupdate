/**
 * ═══════════════════════════════════════════════════════════════
 *  PROJECT RUNE — TikTok Video Info Module (No Puppeteer)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Scrapes public TikTok video data using HTTP requests only.
 *  Multi-strategy approach:
 *    1. tikwm.com API (most reliable)
 *    2. Direct HTML fetch + JSON parsing
 *    3. TikTok oEmbed endpoint (fallback)
 *
 *  No Puppeteer/Chromium required.
 *
 *  ⚠️  Educational / personal use only.
 * ═══════════════════════════════════════════════════════════════
 */

const axios = require("axios");

// ─── Utility: Human-readable number formatter ────────────────
function formatCount(num) {
  if (typeof num !== "number" || isNaN(num)) return "0";
  if (num >= 1_000_000_000)
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

// ─── Utility: Parse TikTok URL to extract video URL ──────────
function parseVideoInput(input) {
  input = input.trim();
  if (input.startsWith("http")) return input;
  if (/^\d+$/.test(input)) return `https://www.tiktok.com/@/video/${input}`;
  if (input.startsWith("vm.tiktok.com") || input.startsWith("vt.tiktok.com"))
    return `https://${input}`;
  return input;
}

// ─── Utility: Format timestamp to readable date ──────────────
function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(
    typeof timestamp === "string" ? parseInt(timestamp) * 1000 : timestamp * 1000
  );
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ─── Utility: Format duration (seconds to mm:ss) ─────────────
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── User-Agent ──────────────────────────────────────────────
function getRandomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

// ─── Extract video ID from URL ───────────────────────────────
function extractVideoId(url) {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// ─── Extract video data from HTML ────────────────────────────
function extractVideoDataFromHtml(html) {
  const universalMatch = html.match(
    /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (universalMatch) {
    try {
      const json = JSON.parse(universalMatch[1]);
      const itemStruct = json?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
      if (itemStruct) return { source: "UNIVERSAL_DATA", item: itemStruct };
    } catch { /* skip */ }
  }

  const sigiMatch = html.match(/<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
  if (sigiMatch) {
    try {
      const json = JSON.parse(sigiMatch[1]);
      const itemModule = json?.ItemModule;
      if (itemModule) {
        const videoId = Object.keys(itemModule)[0];
        if (videoId) {
          const item = itemModule[videoId];
          const userModule = json?.UserModule?.users || {};
          const authorKey = typeof item.author === "string" ? item.author : item.author?.uniqueId;
          item._authorDetail = userModule[authorKey] || {};
          return { source: "SIGI_STATE", item };
        }
      }
    } catch { /* skip */ }
  }

  return null;
}

// ─── Build result from TikTok native data ────────────────────
function buildNativeResult(item, source, videoUrl) {
  const author = item._authorDetail || item.author || {};
  const stats = item.stats || {};
  const music = item.music || {};
  const video = item.video || {};
  const authorObj = typeof author === "string" ? { uniqueId: author } : author;

  return {
    videoId: item.id || "",
    videoUrl: videoUrl,
    description: item.desc || "",
    createdAt: item.createTime ? formatDate(item.createTime) : "Unknown",
    createTimestamp: item.createTime || null,
    author: {
      uid: authorObj.id || "",
      username: authorObj.uniqueId || "",
      nickname: authorObj.nickname || "",
      avatar: authorObj.avatarLarger || authorObj.avatarMedium || authorObj.avatarThumb || "",
      verified: authorObj.verified || false,
    },
    stats: {
      views: stats.playCount || 0,
      likes: stats.diggCount || 0,
      comments: stats.commentCount || 0,
      shares: stats.shareCount || 0,
      bookmarks: stats.collectCount || 0,
      reposts: stats.repostCount || 0,
    },
    formatted: {
      views: formatCount(stats.playCount || 0),
      likes: formatCount(stats.diggCount || 0),
      comments: formatCount(stats.commentCount || 0),
      shares: formatCount(stats.shareCount || 0),
      bookmarks: formatCount(stats.collectCount || 0),
    },
    music: {
      title: music.title || "",
      author: music.authorName || "",
      album: music.album || "",
      duration: formatDuration(music.duration),
      coverUrl: music.coverLarge || music.coverMedium || music.coverThumb || "",
    },
    video: {
      duration: formatDuration(video.duration),
      durationSeconds: video.duration || 0,
      resolution: video.width && video.height ? `${video.width}x${video.height}` : "Unknown",
      ratio: video.ratio || "",
      cover: video.cover || video.originCover || video.dynamicCover || "",
      originCover: video.originCover || "",
      dynamicCover: video.dynamicCover || "",
      downloadUrl: video.playAddr || video.downloadAddr || "",
    },
    hashtags: (item.textExtra || []).filter((t) => t.hashtagName).map((t) => t.hashtagName),
    location: item.locationCreated || "",
    isAd: item.isAd || false,
    scrapedAt: new Date().toISOString(),
    source,
  };
}

// ─── Main Scraper Function ───────────────────────────────────
async function scrapeTikTokVideo(videoInput) {
  const videoUrl = parseVideoInput(videoInput);
  const videoId = extractVideoId(videoUrl);
  console.log(`[RUNE:VIDEO] Fetching video info: ${videoUrl}${videoId ? ` (ID: ${videoId})` : ""}`);

  const strategies = [
    // ═══ Strategy 1: tikwm.com API (most reliable) ═══
    {
      name: "TikWM API",
      fn: async () => {
        const apiUrl = "https://www.tikwm.com/api/";
        const response = await axios.post(
          apiUrl,
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

        const author = data.author || {};
        const music = data.music_info || {};

        return {
          videoId: data.id || videoId || "",
          videoUrl: videoUrl,
          description: data.title || "",
          createdAt: data.create_time ? formatDate(data.create_time) : "Unknown",
          createTimestamp: data.create_time || null,
          author: {
            uid: author.id || "",
            username: author.unique_id || "",
            nickname: author.nickname || "",
            avatar: author.avatar || "",
            verified: false,
          },
          stats: {
            views: data.play_count || 0,
            likes: data.digg_count || 0,
            comments: data.comment_count || 0,
            shares: data.share_count || 0,
            bookmarks: data.collect_count || 0,
            reposts: data.repost_count || 0,
          },
          formatted: {
            views: formatCount(data.play_count || 0),
            likes: formatCount(data.digg_count || 0),
            comments: formatCount(data.comment_count || 0),
            shares: formatCount(data.share_count || 0),
            bookmarks: formatCount(data.collect_count || 0),
          },
          music: {
            title: music.title || data.music || "",
            author: music.author || "",
            album: music.album || "",
            duration: formatDuration(music.duration || data.music_info?.duration || 0),
            coverUrl: music.cover || "",
          },
          video: {
            duration: formatDuration(data.duration || 0),
            durationSeconds: data.duration || 0,
            resolution: data.width && data.height ? `${data.width}x${data.height}` : "Unknown",
            ratio: data.ratio || "",
            cover: data.cover || data.origin_cover || "",
            originCover: data.origin_cover || "",
            dynamicCover: data.dynamic_cover || "",
            downloadUrl: data.play || "",
            downloadUrlHD: data.hdplay || "",
            downloadUrlNoWM: data.play || "",
            wmDownloadUrl: data.wmplay || "",
          },
          hashtags: (data.title || "").match(/#(\w+)/g)?.map((h) => h.replace("#", "")) || [],
          location: data.region || "",
          isAd: false,
          scrapedAt: new Date().toISOString(),
          source: "TIKWM_API",
        };
      },
    },

    // ═══ Strategy 2: Direct HTML fetch + JSON parse ═══
    {
      name: "HTML Fetch",
      fn: async () => {
        const response = await axios.get(videoUrl, {
          headers: {
            "User-Agent": getRandomUA(),
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Upgrade-Insecure-Requests": "1",
          },
          timeout: 15000,
          maxRedirects: 5,
        });

        const html = response.data;
        if (typeof html !== "string" || html.length < 5000) throw new Error("Got WAF challenge page");
        if (html.includes("Couldn't find this page") || html.includes('"statusCode":10204'))
          throw new Error("Video not found or has been removed");

        const extracted = extractVideoDataFromHtml(html);
        if (!extracted) throw new Error("No video data found in HTML");

        const finalUrl = response.request?.res?.responseUrl || videoUrl;
        return buildNativeResult(extracted.item, extracted.source, finalUrl);
      },
    },

    // ═══ Strategy 3: oEmbed fallback (limited data but reliable) ═══
    {
      name: "oEmbed",
      fn: async () => {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(oembedUrl, {
          headers: { "User-Agent": getRandomUA(), Accept: "application/json" },
          timeout: 10000,
        });

        if (!response.data?.title) throw new Error("oEmbed returned no data");
        const data = response.data;

        return {
          videoId: videoId || "",
          videoUrl: videoUrl,
          description: data.title || "",
          createdAt: "Unknown",
          createTimestamp: null,
          author: {
            uid: "",
            username: data.author_unique_id || data.author_name || "",
            nickname: data.author_name || "",
            avatar: data.thumbnail_url || "",
            verified: false,
          },
          stats: { views: 0, likes: 0, comments: 0, shares: 0, bookmarks: 0, reposts: 0 },
          formatted: { views: "N/A", likes: "N/A", comments: "N/A", shares: "N/A", bookmarks: "N/A" },
          music: { title: "", author: "", album: "", duration: "0:00", coverUrl: "" },
          video: {
            duration: "0:00",
            durationSeconds: 0,
            resolution: `${data.thumbnail_width || 0}x${data.thumbnail_height || 0}`,
            ratio: "",
            cover: data.thumbnail_url || "",
            originCover: data.thumbnail_url || "",
            dynamicCover: "",
            downloadUrl: "",
          },
          hashtags: [],
          location: "",
          isAd: false,
          scrapedAt: new Date().toISOString(),
          source: "OEMBED",
        };
      },
    },
  ];

  let lastError = null;

  for (const strategy of strategies) {
    try {
      console.log(`[RUNE:VIDEO] Trying: ${strategy.name}...`);
      const result = await strategy.fn();
      console.log(`[RUNE:VIDEO] ✅ Success via ${strategy.name} (video ${result.videoId})`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`[RUNE:VIDEO] ⚠️  ${strategy.name} failed: ${error.message}`);
      if (error.message.includes("not found") || error.message.includes("removed")) throw error;
    }
  }

  throw lastError || new Error("Could not extract video data after all strategies");
}

module.exports = { scrapeTikTokVideo, formatCount, formatDate, formatDuration };
