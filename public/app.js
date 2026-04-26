/**
 * ═══════════════════════════════════════════════════════
 *  PROJECT RUNE — TikTok Intelligence Suite
 *  Frontend Logic v1.1
 *  Profile Stalk + Video Info
 * ═══════════════════════════════════════════════════════
 */

let currentProfileData = null;
let currentVideoData = null;

// ═══════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    // Activate clicked
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById(`tabContent${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.add('active');
  });
});

// ═══════════════════════════════════════════════════════
//  PROFILE STALK
// ═══════════════════════════════════════════════════════
const searchForm = document.getElementById('searchForm');
const usernameInput = document.getElementById('usernameInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const resultSection = document.getElementById('resultSection');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.replace(/^@/, '').trim();
  if (!username) return;

  searchBtn.classList.add('loading');
  errorMessage.style.display = 'none';
  resultSection.style.display = 'none';

  try {
    const response = await fetch(`/api/tiktok/stalk/${encodeURIComponent(username)}`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch profile');

    currentProfileData = result.data;
    renderProfile(result.data);
    resultSection.style.display = 'block';
    setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  } catch (err) {
    showError('errorMessage', 'errorText', err.message);
  } finally {
    searchBtn.classList.remove('loading');
  }
});

function renderProfile(data) {
  const avatarImg = document.getElementById('profileAvatar');
  if (data.avatar) {
    avatarImg.src = `/api/proxy-image?url=${encodeURIComponent(data.avatar)}`;
    avatarImg.onerror = () => {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nickname || data.username)}&background=6d28d9&color=fff&size=200&bold=true`;
    };
  } else {
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nickname || data.username)}&background=6d28d9&color=fff&size=200&bold=true`;
  }

  document.getElementById('userNickname').textContent = data.nickname || data.username;
  document.getElementById('userHandle').textContent = `@${data.username}`;
  document.getElementById('userBio').textContent = data.bio || 'No bio available';
  document.getElementById('verifiedBadge').style.display = data.verified ? 'flex' : 'none';

  const regionBadge = document.getElementById('badgeRegion');
  if (data.region && data.region !== 'N/A') {
    document.getElementById('regionText').textContent = data.region;
    regionBadge.style.display = 'inline-flex';
  } else {
    regionBadge.style.display = 'none';
  }
  document.getElementById('badgePrivate').style.display = data.privateAccount ? 'inline-flex' : 'none';

  document.getElementById('statFollowers').textContent = data.formatted?.followers || formatNum(data.stats?.followers);
  document.getElementById('statFollowing').textContent = data.formatted?.following || formatNum(data.stats?.following);
  document.getElementById('statHearts').textContent = data.formatted?.hearts || formatNum(data.stats?.hearts);
  document.getElementById('statVideos').textContent = data.formatted?.videos || formatNum(data.stats?.videos);
  document.getElementById('openProfileLink').href = data.profileUrl || `https://www.tiktok.com/@${data.username}`;
  document.getElementById('rawJsonContent').textContent = JSON.stringify(data, null, 2);
  document.getElementById('rawJson').style.display = 'none';

  animateCounters([
    { el: 'statFollowers', val: data.stats?.followers || 0, formatted: data.formatted?.followers },
    { el: 'statFollowing', val: data.stats?.following || 0, formatted: data.formatted?.following },
    { el: 'statHearts', val: data.stats?.hearts || 0, formatted: data.formatted?.hearts },
    { el: 'statVideos', val: data.stats?.videos || 0, formatted: data.formatted?.videos },
  ]);
}

// ═══════════════════════════════════════════════════════
//  VIDEO INFO
// ═══════════════════════════════════════════════════════
const videoSearchForm = document.getElementById('videoSearchForm');
const videoUrlInput = document.getElementById('videoUrlInput');
const videoSearchBtn = document.getElementById('videoSearchBtn');
const videoResultSection = document.getElementById('videoResultSection');

videoSearchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = videoUrlInput.value.trim();
  if (!url) return;

  videoSearchBtn.classList.add('loading');
  document.getElementById('videoErrorMessage').style.display = 'none';
  videoResultSection.style.display = 'none';

  try {
    const response = await fetch('/api/tiktok/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch video info');

    currentVideoData = result.data;
    renderVideoInfo(result.data);
    videoResultSection.style.display = 'block';
    setTimeout(() => videoResultSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  } catch (err) {
    showError('videoErrorMessage', 'videoErrorText', err.message);
  } finally {
    videoSearchBtn.classList.remove('loading');
  }
});

function renderVideoInfo(data) {
  // Cover image
  const coverImg = document.getElementById('videoCover');
  if (data.video?.cover || data.video?.originCover) {
    const coverUrl = data.video.originCover || data.video.cover;
    coverImg.src = `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`;
    coverImg.onerror = () => { coverImg.src = ''; coverImg.style.display = 'none'; };
    coverImg.style.display = 'block';
  } else {
    coverImg.style.display = 'none';
  }

  // Duration badge
  document.getElementById('videoDuration').textContent = data.video?.duration || '0:00';

  // Author info
  const authorAvatar = document.getElementById('videoAuthorAvatar');
  if (data.author?.avatar) {
    authorAvatar.src = `/api/proxy-image?url=${encodeURIComponent(data.author.avatar)}`;
    authorAvatar.onerror = () => {
      authorAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author.nickname || data.author.username)}&background=6d28d9&color=fff&size=80&bold=true`;
    };
  } else {
    authorAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author?.nickname || 'U')}&background=6d28d9&color=fff&size=80&bold=true`;
  }
  document.getElementById('videoAuthorNick').textContent = data.author?.nickname || data.author?.username || '—';
  document.getElementById('videoAuthorHandle').textContent = `@${data.author?.username || '—'}`;
  document.getElementById('videoVerifiedBadge').style.display = data.author?.verified ? 'flex' : 'none';

  // Description
  document.getElementById('videoDescription').textContent = data.description || 'No description';

  // Hashtags
  const hashtagsContainer = document.getElementById('videoHashtags');
  hashtagsContainer.innerHTML = '';
  if (data.hashtags && data.hashtags.length > 0) {
    data.hashtags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'hashtag';
      span.textContent = `#${tag}`;
      hashtagsContainer.appendChild(span);
    });
  }

  // Stats
  document.getElementById('vstatViews').textContent = data.formatted?.views || formatNum(data.stats?.views);
  document.getElementById('vstatLikes').textContent = data.formatted?.likes || formatNum(data.stats?.likes);
  document.getElementById('vstatComments').textContent = data.formatted?.comments || formatNum(data.stats?.comments);
  document.getElementById('vstatShares').textContent = data.formatted?.shares || formatNum(data.stats?.shares);
  document.getElementById('vstatBookmarks').textContent = data.formatted?.bookmarks || formatNum(data.stats?.bookmarks);

  // Animate video stats
  animateCounters([
    { el: 'vstatViews', val: data.stats?.views || 0, formatted: data.formatted?.views },
    { el: 'vstatLikes', val: data.stats?.likes || 0, formatted: data.formatted?.likes },
    { el: 'vstatComments', val: data.stats?.comments || 0, formatted: data.formatted?.comments },
    { el: 'vstatShares', val: data.stats?.shares || 0, formatted: data.formatted?.shares },
    { el: 'vstatBookmarks', val: data.stats?.bookmarks || 0, formatted: data.formatted?.bookmarks },
  ]);

  // Details table
  document.getElementById('detailVideoId').textContent = data.videoId || '—';
  document.getElementById('detailCreatedAt').textContent = data.createdAt || '—';
  document.getElementById('detailDuration').textContent = data.video?.duration || '—';
  document.getElementById('detailResolution').textContent = data.video?.resolution || '—';
  document.getElementById('detailAuthorUid').textContent = data.author?.uid || '—';
  document.getElementById('detailLocation').textContent = data.location || '—';
  document.getElementById('detailIsAd').textContent = data.isAd ? '⚠️ Yes' : '✅ No';

  // Music section
  const musicTitle = data.music?.title;
  if (musicTitle) {
    document.getElementById('musicSection').style.display = 'block';
    document.getElementById('musicTitle').textContent = musicTitle;
    document.getElementById('musicArtist').textContent = data.music?.author || 'Unknown';
    document.getElementById('musicDuration').textContent = `⏱ ${data.music?.duration || '0:00'}`;

    const musicCover = document.getElementById('musicCover');
    if (data.music?.coverUrl) {
      musicCover.src = `/api/proxy-image?url=${encodeURIComponent(data.music.coverUrl)}`;
      musicCover.onerror = () => { musicCover.src = ''; };
    } else {
      musicCover.src = '';
    }
  } else {
    document.getElementById('musicSection').style.display = 'none';
  }

  // Action link
  document.getElementById('openVideoLink').href = data.videoUrl || '#';

  // Raw JSON
  document.getElementById('videoRawJsonContent').textContent = JSON.stringify(data, null, 2);
  document.getElementById('videoRawJson').style.display = 'none';
}

// ═══════════════════════════════════════════════════════
//  SHARED UTILITIES
// ═══════════════════════════════════════════════════════

function formatNum(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

function animateCounters(targets) {
  targets.forEach(({ el, val, formatted }) => {
    const element = document.getElementById(el);
    if (!element) return;
    const duration = 800, steps = 30, stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = 1 - Math.pow(1 - (step / steps), 3);
      element.textContent = formatNum(Math.round(val * progress));
      if (step >= steps) {
        clearInterval(timer);
        element.textContent = formatted || formatNum(val);
      }
    }, stepTime);
  });
}

function showError(containerId, textId, message) {
  document.getElementById(textId).textContent = message;
  document.getElementById(containerId).style.display = 'flex';
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ─── Copy Profile Data ───────────────────────────────
document.getElementById('copyDataBtn').addEventListener('click', () => {
  if (!currentProfileData) return;
  const d = currentProfileData;
  const text = [
    `═══ TikTok Profile: @${d.username} ═══`,
    `Nickname : ${d.nickname}`,
    `Bio      : ${d.bio || '-'}`,
    `Verified : ${d.verified ? '✅ Yes' : '❌ No'}`,
    `Private  : ${d.privateAccount ? '🔒 Yes' : '🔓 No'}`,
    `Region   : ${d.region || 'N/A'}`,
    `──────────────────────────────`,
    `Followers: ${d.formatted?.followers || d.stats?.followers}`,
    `Following: ${d.formatted?.following || d.stats?.following}`,
    `Likes    : ${d.formatted?.hearts || d.stats?.hearts}`,
    `Videos   : ${d.formatted?.videos || d.stats?.videos}`,
    `──────────────────────────────`,
    `Profile  : ${d.profileUrl}`,
    `Scraped  : ${d.scrapedAt}`,
    `\nPowered by Project Rune 🔮`
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('📋 Profile data copied!')).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('📋 Copied!');
  });
});

// ─── Copy Video Data ─────────────────────────────────
document.getElementById('copyVideoDataBtn').addEventListener('click', () => {
  if (!currentVideoData) return;
  const d = currentVideoData;
  const text = [
    `═══ TikTok Video Info ═══`,
    `Video ID   : ${d.videoId || '-'}`,
    `Author     : @${d.author?.username} (${d.author?.nickname})`,
    `Author UID : ${d.author?.uid || '-'}`,
    `Created At : ${d.createdAt}`,
    `Duration   : ${d.video?.duration}`,
    `Resolution : ${d.video?.resolution}`,
    `──────────────────────────────`,
    `Description: ${d.description || '-'}`,
    `Hashtags   : ${d.hashtags?.map(t => '#' + t).join(' ') || '-'}`,
    `──────────────────────────────`,
    `Views      : ${d.formatted?.views || d.stats?.views}`,
    `Likes      : ${d.formatted?.likes || d.stats?.likes}`,
    `Comments   : ${d.formatted?.comments || d.stats?.comments}`,
    `Shares     : ${d.formatted?.shares || d.stats?.shares}`,
    `Bookmarks  : ${d.formatted?.bookmarks || d.stats?.bookmarks}`,
    `──────────────────────────────`,
    `Music      : ${d.music?.title} - ${d.music?.author}`,
    `Video URL  : ${d.videoUrl}`,
    `Is Ad      : ${d.isAd ? 'Yes' : 'No'}`,
    `Scraped    : ${d.scrapedAt}`,
    `\nPowered by Project Rune 🔮`
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('📋 Video data copied!')).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('📋 Copied!');
  });
});

// ─── Toggle Raw JSON (Profile) ───────────────────────
document.getElementById('rawToggleBtn').addEventListener('click', () => {
  const el = document.getElementById('rawJson');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
});

// ─── Toggle Raw JSON (Video) ─────────────────────────
document.getElementById('videoRawToggleBtn').addEventListener('click', () => {
  const el = document.getElementById('videoRawJson');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
});

// ─── Input Auto-clean ────────────────────────────────
usernameInput.addEventListener('input', () => {
  usernameInput.value = usernameInput.value.replace(/[^a-zA-Z0-9._]/g, '');
});
