/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — TikTok Video Scraper (Server-side)
 * ═══════════════════════════════════════════════════════════
 *  Fetches TikTok video metadata via TikWM API.
 *  Used for sound verification on submission.
 * ═══════════════════════════════════════════════════════════
 */

import axios from "axios";

export interface TikTokVideoData {
  videoId: string;
  description: string;
  author: {
    uid: string;
    username: string;
    nickname: string;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  music: {
    id: string;
    title: string;
    author: string;
  };
  duration: number;
  createTime: number | null;
}

function getRandomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

export async function scrapeTikTokVideo(videoUrl: string): Promise<TikTokVideoData> {
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

  const author = data.author || {};
  const music = data.music_info || {};

  return {
    videoId: data.id || "",
    description: data.title || "",
    author: {
      uid: author.id || "",
      username: author.unique_id || "",
      nickname: author.nickname || "",
    },
    stats: {
      views: data.play_count || 0,
      likes: data.digg_count || 0,
      comments: data.comment_count || 0,
      shares: data.share_count || 0,
    },
    music: {
      id: music.id || data.music_id || "",
      title: music.title || data.music || "",
      author: music.author || "",
    },
    duration: data.duration || 0,
    createTime: data.create_time || null,
  };
}

/**
 * Compare video's music with campaign's required sounds.
 * Returns { matched, matchedSound, reason }
 */
export function verifySoundMatch(
  videoMusic: { id: string; title: string; author: string },
  campaignSounds: { title?: string; tiktokSoundId?: string; soundUrl?: string }[]
): { matched: boolean; matchedSound: string | null; reason: string } {

  // If campaign has no specific sounds, any sound is fine
  if (!campaignSounds || campaignSounds.length === 0) {
    return { matched: true, matchedSound: null, reason: "Campaign has no sound requirement" };
  }

  for (const sound of campaignSounds) {
    // 1. Match by TikTok Sound ID (most accurate)
    if (sound.tiktokSoundId && videoMusic.id && sound.tiktokSoundId === videoMusic.id) {
      return { matched: true, matchedSound: sound.title || sound.tiktokSoundId, reason: "Sound ID matched" };
    }

    // 2. Match by sound URL containing the ID
    if (sound.soundUrl && videoMusic.id && sound.soundUrl.includes(videoMusic.id)) {
      return { matched: true, matchedSound: sound.title || "URL match", reason: "Sound URL matched" };
    }

    // 3. Fuzzy match by title (normalized lowercase, remove special chars)
    if (sound.title && videoMusic.title) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const campaignTitle = normalize(sound.title);
      const videoTitle = normalize(videoMusic.title);

      // Exact match
      if (campaignTitle === videoTitle) {
        return { matched: true, matchedSound: sound.title, reason: "Sound title exact match" };
      }

      // Partial match (video title contains campaign sound name or vice versa)
      if (videoTitle.includes(campaignTitle) || campaignTitle.includes(videoTitle)) {
        return { matched: true, matchedSound: sound.title, reason: "Sound title partial match" };
      }

      // Word-based similarity (at least 60% words match)
      const campaignWords = campaignTitle.split(/\s+/).filter(w => w.length > 2);
      const videoWords = videoTitle.split(/\s+/).filter(w => w.length > 2);
      if (campaignWords.length > 0) {
        const matchedWords = campaignWords.filter(w => videoWords.includes(w));
        const similarity = matchedWords.length / campaignWords.length;
        if (similarity >= 0.6) {
          return { matched: true, matchedSound: sound.title, reason: `Sound title similar (${Math.round(similarity * 100)}% match)` };
        }
      }
    }
  }

  // Build list of required sounds for error message
  const soundNames = campaignSounds.map(s => s.title || s.tiktokSoundId || "unknown").join(", ");
  return {
    matched: false,
    matchedSound: null,
    reason: `Video uses "${videoMusic.title || "unknown sound"}" but campaign requires: ${soundNames}`,
  };
}
