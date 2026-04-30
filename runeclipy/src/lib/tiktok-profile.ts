/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — TikTok Profile Scraper (Server-side)
 * ═══════════════════════════════════════════════════════════
 *  Multi-strategy scraper with aggressive cache-busting.
 *  7 strategies to maximize fresh bio detection.
 * ═══════════════════════════════════════════════════════════
 */

import axios from "axios";

export interface TikTokProfile {
  username: string;
  nickname: string;
  bio: string;
  avatar: string;
  verified: boolean;
  followers: number;
  following: number;
  hearts: number;
  videos: number;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBio(bio: string): string {
  return bio
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeProfile(
  username: string,
  user: Record<string, unknown>,
  stats: Record<string, unknown>,
  bio: string
): TikTokProfile {
  return {
    username: (user.uniqueId || user.unique_id || username) as string,
    nickname: (user.nickname || "") as string,
    bio,
    avatar: (user.avatarLarger || user.avatarMedium || user.avatar || "") as string,
    verified: (user.verified || false) as boolean,
    followers: (stats.followerCount || stats.follower_count || 0) as number,
    following: (stats.followingCount || stats.following_count || 0) as number,
    hearts: (stats.heartCount || stats.heart_count || stats.total_favorited || 0) as number,
    videos: (stats.videoCount || stats.video_count || 0) as number,
  };
}

// ═══ Strategy 1: TikWM POST ═══
async function tryTikWM_POST(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.post(
      `https://www.tikwm.com/api/user/info`,
      `unique_id=${encodeURIComponent(username)}&count=1&cursor=0&_=${Date.now()}&t=${Math.random()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Origin: "https://www.tikwm.com",
          Referer: "https://www.tikwm.com/",
        },
        timeout: 15000,
      }
    );
    const d = res.data;
    if (d?.code === 0 && d?.data) {
      const rawData = d.data;
      const user = rawData.user || rawData;
      const stats = rawData.stats || {};
      const bio = normalizeBio(user.signature || rawData.signature || "");
      console.log(`[Profile] TikWM POST bio: "${bio}"`);
      return makeProfile(username, user, stats, bio);
    }
  } catch (err) {
    console.error("[Profile] TikWM POST failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 2: TikWM GET ═══
async function tryTikWM_GET(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(
      `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}&_=${Date.now()}&nocache=${Math.random()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
        timeout: 15000,
      }
    );
    const d = res.data;
    if (d?.code === 0 && d?.data) {
      const rawData = d.data;
      const user = rawData.user || rawData;
      const stats = rawData.stats || {};
      const bio = normalizeBio(user.signature || rawData.signature || "");
      console.log(`[Profile] TikWM GET bio: "${bio}"`);
      return makeProfile(username, user, stats, bio);
    }
  } catch (err) {
    console.error("[Profile] TikWM GET failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 3: TikTok Direct API ═══
async function tryTikTokAPI(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(
      `https://www.tiktok.com/api/user/detail/?uniqueId=${encodeURIComponent(username)}&_t=${Date.now()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json, text/plain, */*",
          Referer: `https://www.tiktok.com/@${username}`,
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        timeout: 12000,
      }
    );
    const userInfo = res.data?.userInfo;
    if (userInfo?.user) {
      const bio = normalizeBio(userInfo.user.signature || "");
      console.log(`[Profile] TikTok API bio: "${bio}"`);
      return makeProfile(username, userInfo.user, userInfo.stats || {}, bio);
    }
  } catch (err) {
    console.error("[Profile] TikTok API failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 4: HTML Scrape with rehydration ═══
async function tryDirectScrape(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}?_r=${Date.now()}&is_from_webapp=1`, {
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = res.data;
    if (typeof html !== "string" || html.length < 3000) return null;

    // Try UNIVERSAL_DATA_FOR_REHYDRATION
    const universalMatch = html.match(
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (universalMatch) {
      try {
        const json = JSON.parse(universalMatch[1]);
        const userInfo = json?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
        if (userInfo?.user) {
          const bio = normalizeBio(userInfo.user.signature || "");
          console.log(`[Profile] HTML UNIVERSAL bio: "${bio}"`);
          return makeProfile(username, userInfo.user, userInfo.stats || {}, bio);
        }
      } catch { /* skip */ }
    }

    // Try SIGI_STATE
    const sigiMatch = html.match(/<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch) {
      try {
        const json = JSON.parse(sigiMatch[1]);
        if (json?.UserModule?.users?.[username]) {
          const user = json.UserModule.users[username];
          const stats = json.UserModule.stats?.[username] || {};
          const bio = normalizeBio(user.signature || "");
          console.log(`[Profile] HTML SIGI bio: "${bio}"`);
          return makeProfile(username, user, stats, bio);
        }
      } catch { /* skip */ }
    }

    // Try JSON-LD
    const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const json = JSON.parse(jsonLdMatch[1]);
        if (json?.description) {
          const bio = normalizeBio(json.description);
          console.log(`[Profile] HTML JSON-LD bio: "${bio}"`);
          return { username, nickname: json.name || "", bio, avatar: "", verified: false, followers: 0, following: 0, hearts: 0, videos: 0 };
        }
      } catch { /* skip */ }
    }

    // Try meta description tag as last resort
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaMatch) {
      const desc = metaMatch[1];
      // TikTok meta descriptions often contain bio text
      if (desc && desc.length > 10) {
        console.log(`[Profile] HTML meta desc: "${desc}"`);
        // Extract just the bio part (usually before stats)
        const bioText = normalizeBio(desc);
        return { username, nickname: "", bio: bioText, avatar: "", verified: false, followers: 0, following: 0, hearts: 0, videos: 0 };
      }
    }
  } catch (err) {
    console.error("[Profile] HTML scrape failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 5: TikTok oEmbed API (often less cached) ═══
async function tryOEmbed(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(username)}&_=${Date.now()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000,
      }
    );
    const data = res.data;
    if (data?.author_name) {
      // oEmbed doesn't directly give bio, but we can extract from title/html
      const htmlContent = data.html || "";
      // Check if there's a bio-like content in the embed
      const bioMatch = htmlContent.match(/data-description="([^"]+)"/);
      const bio = bioMatch ? normalizeBio(bioMatch[1]) : "";
      console.log(`[Profile] oEmbed result: author=${data.author_name}, bio="${bio}"`);
      if (bio) {
        return { username, nickname: data.author_name || "", bio, avatar: "", verified: false, followers: 0, following: 0, hearts: 0, videos: 0 };
      }
    }
  } catch (err) {
    console.error("[Profile] oEmbed failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 6: Mobile API endpoint ═══
async function tryMobileAPI(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(
      `https://m.tiktok.com/api/user/detail/?uniqueId=${encodeURIComponent(username)}&_=${Date.now()}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept: "application/json",
          Referer: `https://m.tiktok.com/@${username}`,
          "Cache-Control": "no-cache",
        },
        timeout: 12000,
      }
    );
    const userInfo = res.data?.userInfo;
    if (userInfo?.user) {
      const bio = normalizeBio(userInfo.user.signature || "");
      console.log(`[Profile] Mobile API bio: "${bio}"`);
      return makeProfile(username, userInfo.user, userInfo.stats || {}, bio);
    }
  } catch (err) {
    console.error("[Profile] Mobile API failed:", (err as Error).message);
  }
  return null;
}

// ═══ Strategy 7: Scraptik ═══
async function tryScraptik(username: string): Promise<TikTokProfile | null> {
  try {
    const res = await axios.get(
      `https://scraptik.com/api/user/info?unique_id=${encodeURIComponent(username)}`,
      {
        headers: { "User-Agent": getRandomUA(), Accept: "application/json" },
        timeout: 10000,
      }
    );
    const data = res.data;
    if (data?.user) {
      const bio = normalizeBio(data.user.signature || data.user.bio || "");
      console.log(`[Profile] Scraptik bio: "${bio}"`);
      return makeProfile(username, data.user, data.stats || {}, bio);
    }
  } catch (err) {
    console.error("[Profile] Scraptik failed:", (err as Error).message);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  Main Scraper
// ═══════════════════════════════════════════════════════════
export async function scrapeTikTokProfile(username: string): Promise<TikTokProfile> {
  console.log(`[Profile] ═══ Multi-strategy scrape for @${username} ═══`);

  const results: TikTokProfile[] = [];
  const strategies = [
    { name: "TikWM POST", fn: () => tryTikWM_POST(username) },
    { name: "TikWM GET", fn: () => tryTikWM_GET(username) },
    { name: "TikTok API", fn: () => tryTikTokAPI(username) },
    { name: "Mobile API", fn: () => tryMobileAPI(username) },
    { name: "HTML Scrape", fn: () => tryDirectScrape(username) },
    { name: "oEmbed", fn: () => tryOEmbed(username) },
    { name: "Scraptik", fn: () => tryScraptik(username) },
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      if (result) {
        results.push(result);
        console.log(`[Profile] ✅ ${strategy.name} bio: "${result.bio}"`);
      }
    } catch (err) {
      console.log(`[Profile] ⚠️ ${strategy.name}: ${(err as Error).message}`);
    }
  }

  if (results.length === 0) {
    console.log("[Profile] All failed. Retrying TikWM after 3s...");
    await delay(3000);
    const lastChance = await tryTikWM_POST(username);
    if (lastChance) return lastChance;
    throw new Error(`Could not fetch profile for @${username}`);
  }

  const bestResult = results.reduce((best, current) => {
    if (current.bio && !best.bio) return current;
    if (current.bio && best.bio && current.bio.length > best.bio.length) return current;
    return best;
  });

  console.log(`[Profile] ═══ Best bio: "${bestResult.bio}" ═══`);
  return bestResult;
}

// ═══════════════════════════════════════════════════════════
//  Verification Scraper — tries harder with more retries
// ═══════════════════════════════════════════════════════════
export async function scrapeForVerification(
  username: string,
  verificationCode: string
): Promise<{ profile: TikTokProfile; codeFound: boolean; allBios: string[] }> {
  console.log(`[Verify] ═══ Verification for @${username}, code: ${verificationCode} ═══`);

  const codeLower = verificationCode.toLowerCase();
  const allBiosCollected: string[] = [];
  const maxRetries = 4;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Verify] Attempt ${attempt}/${maxRetries}...`);

    // Run ALL strategies in parallel
    const strategyResults = await Promise.allSettled([
      tryTikWM_POST(username),
      tryTikWM_GET(username),
      tryTikTokAPI(username),
      tryMobileAPI(username),
      tryDirectScrape(username),
      tryOEmbed(username),
      tryScraptik(username),
    ]);

    const profiles: TikTokProfile[] = [];
    for (const result of strategyResults) {
      if (result.status === "fulfilled" && result.value) {
        profiles.push(result.value);
      }
    }

    // Check each bio for code
    for (const profile of profiles) {
      const bioLower = normalizeBio(profile.bio || "").toLowerCase();
      if (bioLower) allBiosCollected.push(profile.bio);

      if (bioLower.includes(codeLower)) {
        console.log(`[Verify] ✅ Code found in bio: "${profile.bio}"`);
        return { profile, codeFound: true, allBios: allBiosCollected };
      }
    }

    // Also check raw bio without normalization (in case code gets mangled)
    for (const profile of profiles) {
      const rawBio = (profile.bio || "").toLowerCase();
      // Check if code chars exist in sequence (fuzzy match)
      const codeChars = codeLower.split("");
      let pos = 0;
      for (const char of rawBio) {
        if (char === codeChars[pos]) pos++;
        if (pos === codeChars.length) {
          console.log(`[Verify] ✅ Code found (fuzzy) in bio: "${profile.bio}"`);
          return { profile, codeFound: true, allBios: allBiosCollected };
        }
      }
    }

    if (profiles.length > 0) {
      console.log(`[Verify] Bios found (attempt ${attempt}):`);
      profiles.forEach((p, i) => console.log(`  [${i}] "${p.bio}"`));
    }

    if (attempt === maxRetries) {
      if (profiles.length > 0) {
        const best = profiles.reduce((a, b) =>
          (b.bio && (!a.bio || b.bio.length > a.bio.length)) ? b : a
        );
        return { profile: best, codeFound: false, allBios: [...new Set(allBiosCollected)] };
      }
    }

    // Increasing delay: 4s, 6s, 8s, 10s
    const waitTime = attempt * 2000 + 2000;
    console.log(`[Verify] Waiting ${waitTime}ms before retry...`);
    await delay(waitTime);
  }

  throw new Error(`Could not fetch profile for @${username}`);
}
