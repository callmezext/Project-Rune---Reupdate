/**
 * ═══════════════════════════════════════════════════════════════
 *  PROJECT RUNE — TikTok Profile Stalk Module (No Puppeteer)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Scrapes public TikTok profile data using HTTP requests only.
 *  Multi-strategy approach:
 *    1. Direct HTML fetch + JSON parsing
 *    2. TikTok web API (with session cookies)
 *    3. TikTok oEmbed endpoint
 *    4. tikwm.com public API (third-party, most reliable)
 *
 *  No Puppeteer/Chromium required — uses axios only.
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
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

// ─── User-Agent ──────────────────────────────────────────────
function getRandomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

// ─── Build standardized profile result ───────────────────────
function buildProfileResult(user, stats, source, username) {
  return {
    username: user.uniqueId || username,
    nickname: user.nickname || user.uniqueId || username,
    bio: user.signature || "",
    avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || user.avatar || "",
    verified: user.verified || false,
    privateAccount: user.privateAccount || false,
    region: user.region || "N/A",
    profileUrl: `https://www.tiktok.com/@${user.uniqueId || username}`,
    stats: {
      followers: stats.followerCount || stats.followers || 0,
      following: stats.followingCount || stats.following || 0,
      hearts: stats.heartCount || stats.heart || stats.likes || 0,
      videos: stats.videoCount || stats.videos || 0,
      digg: stats.diggCount || 0,
      friends: stats.friendCount || 0,
    },
    formatted: {
      followers: formatCount(stats.followerCount || stats.followers || 0),
      following: formatCount(stats.followingCount || stats.following || 0),
      hearts: formatCount(stats.heartCount || stats.heart || stats.likes || 0),
      videos: formatCount(stats.videoCount || stats.videos || 0),
    },
    scrapedAt: new Date().toISOString(),
    source,
  };
}

// ─── Extract profile from HTML ───────────────────────────────
function extractProfileFromHtml(html) {
  const universalMatch = html.match(
    /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (universalMatch) {
    try {
      const json = JSON.parse(universalMatch[1]);
      const userInfo = json?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
      if (userInfo?.user) return { source: "UNIVERSAL_DATA", user: userInfo.user, stats: userInfo.stats || {} };
    } catch { /* skip */ }
  }

  const sigiMatch = html.match(/<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
  if (sigiMatch) {
    try {
      const json = JSON.parse(sigiMatch[1]);
      const users = json?.UserModule?.users || {};
      const stats = json?.UserModule?.stats || {};
      const userId = Object.keys(users)[0];
      if (userId) return { source: "SIGI_STATE", user: users[userId], stats: stats[userId] || {} };
    } catch { /* skip */ }
  }

  return null;
}

// ─── Main Scraper Function ───────────────────────────────────
async function scrapeTikTokProfile(username) {
  console.log(`[RUNE:STALK] Fetching profile: @${username}`);

  const strategies = [
    // ═══ Strategy 1: tikwm.com API (most reliable, bypasses WAF) ═══
    {
      name: "TikWM API",
      fn: async () => {
        const apiUrl = `https://www.tikwm.com/api/user/info?unique_id=${username}`;
        const response = await axios.get(apiUrl, {
          headers: {
            "User-Agent": getRandomUA(),
            Accept: "application/json",
          },
          timeout: 10000,
        });

        const d = response.data;
        if (d?.code !== 0 && d?.code !== undefined) {
          throw new Error(d?.msg || "API returned error");
        }

        const data = d?.data;
        if (!data) throw new Error("No data in response");

        // TikWM returns nested: data.user + data.stats
        const user = data.user || data;
        const stats = data.stats || {};

        return {
          username: user.uniqueId || user.unique_id || username,
          nickname: user.nickname || user.uniqueId || username,
          bio: user.signature || "",
          avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
          verified: user.verified || false,
          privateAccount: user.privateAccount || user.secret || false,
          region: user.region || "N/A",
          profileUrl: `https://www.tiktok.com/@${user.uniqueId || user.unique_id || username}`,
          createTime: user.createTime || null,
          stats: {
            followers: stats.followerCount || stats.follower_count || 0,
            following: stats.followingCount || stats.following_count || 0,
            hearts: stats.heartCount || stats.heart || stats.heart_count || 0,
            videos: stats.videoCount || stats.video_count || 0,
            digg: stats.diggCount || stats.digg_count || 0,
            friends: stats.friendCount || stats.friend_count || 0,
          },
          formatted: {
            followers: formatCount(stats.followerCount || stats.follower_count || 0),
            following: formatCount(stats.followingCount || stats.following_count || 0),
            hearts: formatCount(stats.heartCount || stats.heart || stats.heart_count || 0),
            videos: formatCount(stats.videoCount || stats.video_count || 0),
          },
          scrapedAt: new Date().toISOString(),
          source: "TIKWM_API",
        };
      },
    },

    // ═══ Strategy 2: Direct HTML fetch (if WAF doesn't block) ═══
    {
      name: "HTML Fetch",
      fn: async () => {
        const profileUrl = `https://www.tiktok.com/@${username}`;
        const response = await axios.get(profileUrl, {
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
        if (html.includes("Couldn't find this account") || html.includes('"statusCode":10202'))
          throw new Error(`User @${username} not found on TikTok`);

        const extracted = extractProfileFromHtml(html);
        if (!extracted) throw new Error("No profile data in HTML");
        return buildProfileResult(extracted.user, extracted.stats, extracted.source, username);
      },
    },

    // ═══ Strategy 3: TikTok API with session ═══
    {
      name: "TikTok API",
      fn: async () => {
        const apiUrl = `https://www.tiktok.com/api/user/detail/?uniqueId=${username}`;
        const response = await axios.get(apiUrl, {
          headers: {
            "User-Agent": getRandomUA(),
            Referer: `https://www.tiktok.com/@${username}`,
            Accept: "application/json",
          },
          timeout: 10000,
        });
        if (response.data?.userInfo?.user) {
          const { user, stats } = response.data.userInfo;
          return buildProfileResult(user, stats || {}, "TIKTOK_API", username);
        }
        throw new Error("API did not return userInfo");
      },
    },
  ];

  let lastError = null;

  for (const strategy of strategies) {
    try {
      console.log(`[RUNE:STALK] Trying: ${strategy.name}...`);
      const result = await strategy.fn();
      console.log(`[RUNE:STALK] ✅ Success via ${strategy.name} — @${result.username}`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`[RUNE:STALK] ⚠️  ${strategy.name} failed: ${error.message}`);
      if (error.message.includes("not found")) throw error;
    }
  }

  throw lastError || new Error("Could not extract profile data after all strategies");
}

module.exports = { scrapeTikTokProfile, formatCount };
