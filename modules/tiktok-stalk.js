/**
 * ═══════════════════════════════════════════════════════════════
 *  PROJECT RUNE — TikTok Profile Stalk Module
 * ═══════════════════════════════════════════════════════════════
 *  
 *  Scrapes public TikTok profile data using Puppeteer.
 *  Extracts user info from the __UNIVERSAL_DATA_FOR_REHYDRATION__
 *  JSON blob embedded in the page source.
 * 
 *  Data extracted:
 *    - Username, Nickname, Bio, Avatar
 *    - Follower / Following / Like / Video counts
 *    - Verified status, Private account flag
 *    - Profile link
 * 
 *  ⚠️  Educational / personal use only.
 *      Respect TikTok's Terms of Service.
 * ═══════════════════════════════════════════════════════════════
 */

const puppeteer = require('puppeteer');

// ─── Utility: Human-readable number formatter ────────────────
function formatCount(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

// ─── Main Scraper Function ───────────────────────────────────
async function scrapeTikTokProfile(username) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();

    // Set realistic viewport & user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Remove webdriver detection flags
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log(`[RUNE:STALK] Navigating to ${profileUrl}`);

    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ─── Strategy 1: Extract from __UNIVERSAL_DATA_FOR_REHYDRATION__ ──
    let profileData = await page.evaluate(() => {
      try {
        const scripts = document.querySelectorAll('script#__UNIVERSAL_DATA_FOR_REHYDRATION__');
        for (const script of scripts) {
          const json = JSON.parse(script.textContent);
          const defaultScope = json?.__DEFAULT_SCOPE__;
          const userDetail = defaultScope?.['webapp.user-detail'];
          const userInfo = userDetail?.userInfo;

          if (userInfo) {
            const user = userInfo.user || {};
            const stats = userInfo.stats || {};
            return {
              source: 'UNIVERSAL_DATA',
              uniqueId: user.uniqueId || '',
              nickname: user.nickname || '',
              bio: user.signature || '',
              avatarLarger: user.avatarLarger || user.avatarMedium || user.avatarThumb || '',
              verified: user.verified || false,
              privateAccount: user.privateAccount || false,
              region: user.region || '',
              createTime: user.createTime || null,
              followers: stats.followerCount || 0,
              following: stats.followingCount || 0,
              hearts: stats.heartCount || stats.heart || 0,
              videos: stats.videoCount || 0,
              digg: stats.diggCount || 0,
              friends: stats.friendCount || 0
            };
          }
        }
      } catch (e) { /* skip */ }
      return null;
    });

    // ─── Strategy 2: Extract from SIGI_STATE ──────────────────────────
    if (!profileData) {
      profileData = await page.evaluate(() => {
        try {
          const scripts = document.querySelectorAll('script#SIGI_STATE');
          for (const script of scripts) {
            const json = JSON.parse(script.textContent);
            const userModule = json?.UserModule;
            if (userModule) {
              const users = userModule.users || {};
              const stats = userModule.stats || {};
              const userId = Object.keys(users)[0];
              if (userId) {
                const user = users[userId];
                const userStats = stats[userId] || {};
                return {
                  source: 'SIGI_STATE',
                  uniqueId: user.uniqueId || userId,
                  nickname: user.nickname || '',
                  bio: user.signature || '',
                  avatarLarger: user.avatarLarger || user.avatarMedium || '',
                  verified: user.verified || false,
                  privateAccount: user.privateAccount || false,
                  region: user.region || '',
                  createTime: user.createTime || null,
                  followers: userStats.followerCount || 0,
                  following: userStats.followingCount || 0,
                  hearts: userStats.heartCount || 0,
                  videos: userStats.videoCount || 0,
                  digg: userStats.diggCount || 0,
                  friends: userStats.friendCount || 0
                };
              }
            }
          }
        } catch (e) { /* skip */ }
        return null;
      });
    }

    // ─── Strategy 3: DOM scraping as fallback ─────────────────────────
    if (!profileData) {
      profileData = await page.evaluate(() => {
        try {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };

          const getAttr = (selector, attr) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute(attr) : '';
          };

          const nickname = getText('[data-e2e="user-subtitle"]') || getText('h1[data-e2e="user-title"]') || '';
          const uniqueId = getText('[data-e2e="user-title"]') || getText('h2[data-e2e="user-subtitle"]') || '';
          const bio = getText('[data-e2e="user-bio"]') || '';
          const avatar = getAttr('[data-e2e="user-avatar"] img', 'src') || getAttr('.css-1zpj2q-ImgAvatar', 'src') || '';

          const parseStatNumber = (text) => {
            if (!text) return 0;
            text = text.replace(/,/g, '').trim();
            const match = text.match(/([\d.]+)\s*([KMBkmb])?/);
            if (!match) return 0;
            let num = parseFloat(match[1]);
            const suffix = (match[2] || '').toUpperCase();
            if (suffix === 'K') num *= 1000;
            else if (suffix === 'M') num *= 1000000;
            else if (suffix === 'B') num *= 1000000000;
            return Math.round(num);
          };

          const followingText = getText('[data-e2e="following-count"]');
          const followersText = getText('[data-e2e="followers-count"]');
          const likesText = getText('[data-e2e="likes-count"]');

          if (!nickname && !uniqueId) return null;

          return {
            source: 'DOM',
            uniqueId: uniqueId,
            nickname: nickname,
            bio: bio,
            avatarLarger: avatar,
            verified: !!document.querySelector('[data-e2e="verify-badge"]'),
            privateAccount: !!document.querySelector('[data-e2e="user-post-item-desc"]')?.textContent?.includes('private'),
            region: '',
            createTime: null,
            followers: parseStatNumber(followersText),
            following: parseStatNumber(followingText),
            hearts: parseStatNumber(likesText),
            videos: 0,
            digg: 0,
            friends: 0
          };
        } catch (e) { return null; }
      });
    }

    if (!profileData) {
      // Check if page shows 404 or user not found
      const pageContent = await page.content();
      if (pageContent.includes("Couldn't find this account") || pageContent.includes('user-not-found')) {
        throw new Error(`User @${username} not found on TikTok`);
      }
      throw new Error('Could not extract profile data. TikTok may be blocking the request.');
    }

    // ─── Build final response ─────────────────────────────────────────
    const result = {
      username: profileData.uniqueId || username,
      nickname: profileData.nickname || profileData.uniqueId || username,
      bio: profileData.bio || '',
      avatar: profileData.avatarLarger || '',
      verified: profileData.verified || false,
      privateAccount: profileData.privateAccount || false,
      region: profileData.region || 'N/A',
      profileUrl: `https://www.tiktok.com/@${profileData.uniqueId || username}`,
      stats: {
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        hearts: profileData.hearts || 0,
        videos: profileData.videos || 0,
        digg: profileData.digg || 0,
        friends: profileData.friends || 0
      },
      formatted: {
        followers: formatCount(profileData.followers || 0),
        following: formatCount(profileData.following || 0),
        hearts: formatCount(profileData.hearts || 0),
        videos: formatCount(profileData.videos || 0)
      },
      scrapedAt: new Date().toISOString(),
      source: profileData.source
    };

    console.log(`[RUNE:STALK] ✅ Successfully scraped @${result.username}`);
    return result;

  } catch (error) {
    console.error(`[RUNE:STALK] ❌ Scrape failed:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeTikTokProfile, formatCount };
