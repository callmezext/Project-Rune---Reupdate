/**
 * ═══════════════════════════════════════════════════════════════
 *  PROJECT RUNE — TikTok Video Info Module
 * ═══════════════════════════════════════════════════════════════
 *
 *  Scrapes public TikTok video data using Puppeteer.
 *  Accepts a full TikTok video URL or a video ID.
 *
 *  Data extracted:
 *    - Video ID, Description, Create Date
 *    - Author info (username, nickname, avatar)
 *    - Like, Comment, Share, View, Bookmark counts
 *    - Video cover/thumbnail, duration
 *    - Music/Sound info
 *
 *  ⚠️  Educational / personal use only.
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

// ─── Utility: Parse TikTok URL to extract video URL ──────────
function parseVideoInput(input) {
  input = input.trim();

  // Already a full URL
  if (input.startsWith('http')) {
    return input;
  }

  // Just a video ID (numeric)
  if (/^\d+$/.test(input)) {
    return `https://www.tiktok.com/@/video/${input}`;
  }

  // vm.tiktok.com short link format
  if (input.startsWith('vm.tiktok.com') || input.startsWith('vt.tiktok.com')) {
    return `https://${input}`;
  }

  return input;
}

// ─── Utility: Format timestamp to readable date ──────────────
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  // TikTok uses Unix timestamps (seconds)
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) return 'Unknown';

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  return date.toLocaleDateString('id-ID', options);
}

// ─── Utility: Format duration (seconds to mm:ss) ─────────────
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Main Scraper Function ───────────────────────────────────
async function scrapeTikTokVideo(videoInput) {
  let browser = null;
  const videoUrl = parseVideoInput(videoInput);

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

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Remove webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    console.log(`[RUNE:VIDEO] Navigating to ${videoUrl}`);

    await page.goto(videoUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ─── Strategy 1: __UNIVERSAL_DATA_FOR_REHYDRATION__ ────────
    let videoData = await page.evaluate(() => {
      try {
        const scripts = document.querySelectorAll('script#__UNIVERSAL_DATA_FOR_REHYDRATION__');
        for (const script of scripts) {
          const json = JSON.parse(script.textContent);
          const defaultScope = json?.__DEFAULT_SCOPE__;
          const videoDetail = defaultScope?.['webapp.video-detail'];
          const itemInfo = videoDetail?.itemInfo?.itemStruct;

          if (itemInfo) {
            const author = itemInfo.author || {};
            const stats = itemInfo.stats || {};
            const music = itemInfo.music || {};
            const video = itemInfo.video || {};

            return {
              source: 'UNIVERSAL_DATA',
              videoId: itemInfo.id || '',
              description: itemInfo.desc || '',
              createTime: itemInfo.createTime || null,
              author: {
                uid: author.id || '',
                uniqueId: author.uniqueId || '',
                nickname: author.nickname || '',
                avatar: author.avatarLarger || author.avatarMedium || author.avatarThumb || '',
                verified: author.verified || false
              },
              stats: {
                likes: stats.diggCount || 0,
                comments: stats.commentCount || 0,
                shares: stats.shareCount || 0,
                views: stats.playCount || 0,
                bookmarks: stats.collectCount || 0,
                reposts: stats.repostCount || 0
              },
              music: {
                id: music.id || '',
                title: music.title || '',
                author: music.authorName || '',
                album: music.album || '',
                duration: music.duration || 0,
                coverUrl: music.coverLarge || music.coverMedium || music.coverThumb || ''
              },
              video: {
                duration: video.duration || 0,
                width: video.width || 0,
                height: video.height || 0,
                ratio: video.ratio || '',
                cover: video.cover || video.originCover || video.dynamicCover || '',
                originCover: video.originCover || '',
                dynamicCover: video.dynamicCover || '',
                format: video.format || '',
                bitrate: video.bitrate || 0
              },
              hashtags: (itemInfo.textExtra || [])
                .filter(t => t.hashtagName)
                .map(t => t.hashtagName),
              locationCreated: itemInfo.locationCreated || '',
              diversificationId: itemInfo.diversificationId || null,
              isAd: itemInfo.isAd || false
            };
          }
        }
      } catch (e) { /* skip */ }
      return null;
    });

    // ─── Strategy 2: SIGI_STATE ────────────────────────────────
    if (!videoData) {
      videoData = await page.evaluate(() => {
        try {
          const scripts = document.querySelectorAll('script#SIGI_STATE');
          for (const script of scripts) {
            const json = JSON.parse(script.textContent);
            const itemModule = json?.ItemModule;
            if (itemModule) {
              const videoId = Object.keys(itemModule)[0];
              if (videoId) {
                const item = itemModule[videoId];
                const author = item.author || {};
                const stats = item.stats || {};
                const music = item.music || {};
                const video = item.video || {};

                // Get author details from UserModule if available
                const userModule = json?.UserModule?.users || {};
                const authorDetail = userModule[author] || userModule[item.author] || {};

                return {
                  source: 'SIGI_STATE',
                  videoId: videoId,
                  description: item.desc || '',
                  createTime: item.createTime || null,
                  author: {
                    uid: authorDetail.id || '',
                    uniqueId: (typeof author === 'string') ? author : (author.uniqueId || ''),
                    nickname: authorDetail.nickname || '',
                    avatar: authorDetail.avatarLarger || authorDetail.avatarMedium || '',
                    verified: authorDetail.verified || false
                  },
                  stats: {
                    likes: stats.diggCount || 0,
                    comments: stats.commentCount || 0,
                    shares: stats.shareCount || 0,
                    views: stats.playCount || 0,
                    bookmarks: stats.collectCount || 0,
                    reposts: stats.repostCount || 0
                  },
                  music: {
                    id: music.id || '',
                    title: music.title || '',
                    author: music.authorName || '',
                    album: music.album || '',
                    duration: music.duration || 0,
                    coverUrl: music.coverLarge || music.coverMedium || ''
                  },
                  video: {
                    duration: video.duration || 0,
                    width: video.width || 0,
                    height: video.height || 0,
                    ratio: video.ratio || '',
                    cover: video.cover || video.originCover || '',
                    originCover: video.originCover || '',
                    dynamicCover: video.dynamicCover || '',
                    format: video.format || '',
                    bitrate: video.bitrate || 0
                  },
                  hashtags: (item.textExtra || [])
                    .filter(t => t.hashtagName)
                    .map(t => t.hashtagName),
                  locationCreated: item.locationCreated || '',
                  isAd: item.isAd || false
                };
              }
            }
          }
        } catch (e) { /* skip */ }
        return null;
      });
    }

    // ─── Strategy 3: DOM scraping fallback ─────────────────────
    if (!videoData) {
      videoData = await page.evaluate(() => {
        try {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };

          const getAttr = (selector, attr) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute(attr) : '';
          };

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

          const description = getText('[data-e2e="browse-video-desc"]') ||
                              getText('[data-e2e="video-desc"]') || '';
          const likes = parseStatNumber(getText('[data-e2e="like-count"]') || getText('[data-e2e="browse-like-count"]'));
          const comments = parseStatNumber(getText('[data-e2e="comment-count"]') || getText('[data-e2e="browse-comment-count"]'));
          const shares = parseStatNumber(getText('[data-e2e="share-count"]'));
          const bookmarks = parseStatNumber(getText('[data-e2e="undefined-count"]') || getText('[data-e2e="bookmark-count"]'));

          const authorName = getText('[data-e2e="browse-username"]') || getText('[data-e2e="video-author-uniqueid"]') || '';
          const authorNick = getText('[data-e2e="browse-user-nickname"]') || getText('[data-e2e="video-author-nickname"]') || '';
          const authorAvatar = getAttr('[data-e2e="browse-user-avatar"] img', 'src') || '';

          if (!description && !authorName) return null;

          return {
            source: 'DOM',
            videoId: '',
            description: description,
            createTime: null,
            author: {
              uid: '',
              uniqueId: authorName,
              nickname: authorNick,
              avatar: authorAvatar,
              verified: false
            },
            stats: {
              likes: likes,
              comments: comments,
              shares: shares,
              views: 0,
              bookmarks: bookmarks,
              reposts: 0
            },
            music: { id: '', title: '', author: '', album: '', duration: 0, coverUrl: '' },
            video: { duration: 0, width: 0, height: 0, ratio: '', cover: '', originCover: '', dynamicCover: '', format: '', bitrate: 0 },
            hashtags: [],
            locationCreated: '',
            isAd: false
          };
        } catch (e) { return null; }
      });
    }

    // Check if video not found
    if (!videoData) {
      const pageContent = await page.content();
      if (pageContent.includes("Couldn't find this page") || pageContent.includes('video unavailable')) {
        throw new Error('Video not found or has been removed');
      }
      throw new Error('Could not extract video data. TikTok may be blocking the request.');
    }

    // Also capture the final URL (in case of redirect from short link)
    const finalUrl = page.url();

    // ─── Build final response ─────────────────────────────────
    const result = {
      videoId: videoData.videoId || '',
      videoUrl: finalUrl || videoUrl,
      description: videoData.description || '',
      createdAt: videoData.createTime ? formatDate(videoData.createTime) : 'Unknown',
      createTimestamp: videoData.createTime || null,
      author: {
        uid: videoData.author.uid || '',
        username: videoData.author.uniqueId || '',
        nickname: videoData.author.nickname || '',
        avatar: videoData.author.avatar || '',
        verified: videoData.author.verified || false
      },
      stats: {
        views: videoData.stats.views || 0,
        likes: videoData.stats.likes || 0,
        comments: videoData.stats.comments || 0,
        shares: videoData.stats.shares || 0,
        bookmarks: videoData.stats.bookmarks || 0,
        reposts: videoData.stats.reposts || 0
      },
      formatted: {
        views: formatCount(videoData.stats.views || 0),
        likes: formatCount(videoData.stats.likes || 0),
        comments: formatCount(videoData.stats.comments || 0),
        shares: formatCount(videoData.stats.shares || 0),
        bookmarks: formatCount(videoData.stats.bookmarks || 0)
      },
      music: {
        title: videoData.music.title || '',
        author: videoData.music.author || '',
        album: videoData.music.album || '',
        duration: formatDuration(videoData.music.duration),
        coverUrl: videoData.music.coverUrl || ''
      },
      video: {
        duration: formatDuration(videoData.video.duration),
        durationSeconds: videoData.video.duration || 0,
        resolution: (videoData.video.width && videoData.video.height)
          ? `${videoData.video.width}x${videoData.video.height}` : 'Unknown',
        ratio: videoData.video.ratio || '',
        cover: videoData.video.cover || '',
        originCover: videoData.video.originCover || '',
        dynamicCover: videoData.video.dynamicCover || ''
      },
      hashtags: videoData.hashtags || [],
      location: videoData.locationCreated || '',
      isAd: videoData.isAd || false,
      scrapedAt: new Date().toISOString(),
      source: videoData.source
    };

    console.log(`[RUNE:VIDEO] ✅ Successfully scraped video ${result.videoId}`);
    return result;

  } catch (error) {
    console.error(`[RUNE:VIDEO] ❌ Scrape failed:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeTikTokVideo, formatCount, formatDate, formatDuration };
