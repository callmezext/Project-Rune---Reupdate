/**
 * Quick test: TikTok profile bio scraping for verification
 * Run: node test-verify-scraper.js <username>
 */

const axios = require("axios");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function testTikWM_POST(username) {
  console.log("\n═══ Strategy 1: TikWM POST ═══");
  try {
    const res = await axios.post(
      `https://www.tikwm.com/api/user/info`,
      `unique_id=${encodeURIComponent(username)}&count=1&cursor=0&_=${Date.now()}&t=${Math.random()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Cache-Control": "no-cache, no-store",
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
      console.log(`  ✅ Username: ${user.uniqueId || user.unique_id || rawData.unique_id}`);
      console.log(`  ✅ Bio: "${user.signature || rawData.signature || "(empty)"}"`);
      console.log(`  ✅ Followers: ${stats.followerCount || stats.follower_count || rawData.follower_count}`);
      return user.signature || rawData.signature || "";
    } else {
      console.log(`  ❌ API returned code: ${d?.code}, msg: ${d?.msg}`);
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
  return null;
}

async function testTikWM_GET(username) {
  console.log("\n═══ Strategy 2: TikWM GET ═══");
  try {
    const res = await axios.get(
      `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}&_=${Date.now()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 15000,
      }
    );

    const d = res.data;
    if (d?.code === 0 && d?.data) {
      const rawData = d.data;
      const user = rawData.user || rawData;
      console.log(`  ✅ Username: ${user.uniqueId || user.unique_id || rawData.unique_id}`);
      console.log(`  ✅ Bio: "${user.signature || rawData.signature || "(empty)"}"`);
      return user.signature || rawData.signature || "";
    } else {
      console.log(`  ❌ API returned code: ${d?.code}`);
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
  return null;
}

async function testTikTokAPI(username) {
  console.log("\n═══ Strategy 3: TikTok Direct API ═══");
  try {
    const res = await axios.get(
      `https://www.tiktok.com/api/user/detail/?uniqueId=${encodeURIComponent(username)}&_t=${Date.now()}`,
      {
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "application/json",
          Referer: `https://www.tiktok.com/@${username}`,
          "Cache-Control": "no-cache",
        },
        timeout: 12000,
      }
    );

    const userInfo = res.data?.userInfo;
    if (userInfo?.user) {
      console.log(`  ✅ Username: ${userInfo.user.uniqueId}`);
      console.log(`  ✅ Bio: "${userInfo.user.signature || "(empty)"}"`);
      console.log(`  ✅ Followers: ${userInfo.stats?.followerCount}`);
      return userInfo.user.signature || "";
    } else {
      console.log(`  ❌ No userInfo in response`);
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
  return null;
}

async function testHTMLScrape(username) {
  console.log("\n═══ Strategy 4: HTML Scrape ═══");
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}?_r=${Date.now()}`, {
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html",
        "Cache-Control": "no-cache",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = res.data;
    console.log(`  📄 HTML length: ${html.length} chars`);

    // Try UNIVERSAL_DATA
    const universalMatch = html.match(
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (universalMatch) {
      const json = JSON.parse(universalMatch[1]);
      const userInfo = json?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
      if (userInfo?.user) {
        console.log(`  ✅ UNIVERSAL_DATA bio: "${userInfo.user.signature || "(empty)"}"`);
        return userInfo.user.signature || "";
      }
    }

    // Try SIGI_STATE
    const sigiMatch = html.match(/<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch) {
      const json = JSON.parse(sigiMatch[1]);
      const user = json?.UserModule?.users?.[username];
      if (user) {
        console.log(`  ✅ SIGI_STATE bio: "${user.signature || "(empty)"}"`);
        return user.signature || "";
      }
    }

    console.log(`  ❌ Could not extract bio from HTML`);
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
  return null;
}

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.log("Usage: node test-verify-scraper.js <tiktok_username>");
    console.log("Example: node test-verify-scraper.js khfrhn");
    process.exit(1);
  }

  const clean = username.replace(/^@/, "");
  console.log(`\n🔍 Testing TikTok bio scraping for: @${clean}\n`);
  console.log("=" .repeat(50));

  const results = [];

  const bio1 = await testTikWM_POST(clean);
  if (bio1 !== null) results.push({ strategy: "TikWM POST", bio: bio1 });

  const bio2 = await testTikWM_GET(clean);
  if (bio2 !== null) results.push({ strategy: "TikWM GET", bio: bio2 });

  const bio3 = await testTikTokAPI(clean);
  if (bio3 !== null) results.push({ strategy: "TikTok API", bio: bio3 });

  const bio4 = await testHTMLScrape(clean);
  if (bio4 !== null) results.push({ strategy: "HTML Scrape", bio: bio4 });

  console.log("\n" + "=".repeat(50));
  console.log("\n📊 RESULTS SUMMARY:");
  console.log("=".repeat(50));

  if (results.length === 0) {
    console.log("❌ All strategies failed!");
  } else {
    results.forEach((r, i) => {
      console.log(`  [${i + 1}] ${r.strategy}: "${r.bio || "(empty)"}"`);
    });

    const bestBio = results.reduce((best, curr) =>
      curr.bio.length > best.bio.length ? curr : best
    );
    console.log(`\n  🏆 Best result: ${bestBio.strategy} — "${bestBio.bio}"`);
  }
}

main().catch(console.error);
