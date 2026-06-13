"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface Campaign {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  type: string;
  status: string;
  totalBudget: number;
  budgetUsed: number;
  ratePerMillionViews: number;
  totalCreators: number;
  supportedPlatforms: string[];
  createdAt: string;
}

interface UserProfile {
  nickname: string;
  username: string;
  memberSince: string;
  stats: { totalVideos: number; totalEarned: number; totalViews: number };
  tierInfo?: {
    tier: string;
    label: string;
    emoji: string;
    color: string;
    rateBonus: number;
    minApproved: number;
    nextTier?: { tier: string; required: number };
  };
  badges?: { id: string; label: string; emoji: string; description: string }[];
}

const typeFilters = ["All", "Music", "Clipping", "Logo", "UGC"];
const platformFilters = ["TikTok", "Instagram", "YouTube"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Highest Budget" },
  { value: "rate", label: "Highest Rate" },
];

const formatCompactCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("All");
  const [sort, setSort] = useState("newest");
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(platformFilters));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    fetchProfile();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.success) setProfile(data.user);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const filteredCampaigns = campaigns
    .filter((c) => activeType === "All" || c.type === activeType.toLowerCase())
    .filter((c) => activePlatforms.size === 0 || c.supportedPlatforms?.some((p) => 
      Array.from(activePlatforms).some((ap) => ap.toLowerCase() === p.toLowerCase())
    ))
    .sort((a, b) => {
      if (sort === "budget") return b.totalBudget - a.totalBudget;
      if (sort === "rate") return b.ratePerMillionViews - a.ratePerMillionViews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const budgetPercent = (c: Campaign) => c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;

  // Calculate pending earnings (from submissions that are approved but not paid out)
  const pendingEarnings = 0; // This would come from API if available

  return (
    <div>
      {/* ═══ Welcome Header ═══ */}
      <h1 className="text-xl sm:text-2xl font-bold mb-5">
        Welcome Back, <span className="gradient-text">{profile?.nickname || profile?.username || "Creator"}</span>
      </h1>

      {/* ═══ Profile Summary Card ═══ */}
      {profileLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 animate-pulse">
          <div className="glass-card p-6 h-52 bg-bg-tertiary/30" />
          <div className="glass-card p-6 h-52 bg-bg-tertiary/30" />
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* ── Left: User Identity Card ── */}
          <div className="glass-card p-0 overflow-hidden relative">
            {/* Glossy gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

            <div className="relative p-5 sm:p-6">
              {/* User info row */}
              <div className="flex items-center gap-4 mb-5">
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-br from-bg-tertiary to-bg-secondary flex items-center justify-center text-3xl font-bold flex-shrink-0 border border-border/50">
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold truncate">{profile.nickname}</h2>
                    <Link href="/profile" title="Edit Profile" className="p-1 rounded-md hover:bg-bg-tertiary transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted hover:text-accent-light transition-colors"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </Link>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    member since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  {/* Approval Rate Badge */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-xs font-semibold text-success">
                      Approval Rate: {profile.stats.totalVideos > 0 ? "Active" : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4">
                <div className="text-center p-2 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-info"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Views</span>
                  </div>
                  <div className="text-sm sm:text-lg font-extrabold">{formatNumber(profile.stats.totalViews)}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Videos</span>
                  </div>
                  <div className="text-sm sm:text-lg font-extrabold">{profile.stats.totalVideos}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Campaigns</span>
                  </div>
                  <div className="text-sm sm:text-lg font-extrabold">{campaigns.length}</div>
                </div>
              </div>

              {/* Badges / Achievements */}
              {profile.badges && profile.badges.length > 0 ? (
                <div className="pt-3 border-t border-border/30">
                  <div className="text-[10px] text-text-muted uppercase tracking-widest font-semibold mb-2">Badges</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.badges.map((badge) => (
                      <div key={badge.id} title={badge.description} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary/50 border border-border/50 text-[11px] font-medium text-text-secondary hover:border-accent/30 transition-colors cursor-default">
                        <span>{badge.emoji}</span> {badge.label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-border/30">
                  <div className="text-[10px] text-text-muted uppercase tracking-widest font-semibold mb-2">Getting Started</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", profile.stats.totalVideos > 0 ? "bg-success/20 text-success" : "bg-bg-tertiary text-text-muted")}>
                        {profile.stats.totalVideos > 0 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : <span className="text-[8px] font-bold">1</span>}
                      </div>
                      <span className={profile.stats.totalVideos > 0 ? "text-text-secondary line-through opacity-50" : "text-text-secondary"}>Submit your first video</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", profile.stats.totalEarned > 0 ? "bg-success/20 text-success" : "bg-bg-tertiary text-text-muted")}>
                        {profile.stats.totalEarned > 0 ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : <span className="text-[8px] font-bold">2</span>}
                      </div>
                      <span className={profile.stats.totalEarned > 0 ? "text-text-secondary line-through opacity-50" : "text-text-secondary"}>Earn your first payout</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-bg-tertiary text-text-muted">
                        <span className="text-[8px] font-bold">3</span>
                      </div>
                      <span className="text-text-secondary">Reach Silver tier</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Earnings + Quick Stats ── */}
          <div className="flex flex-col gap-4">
            {/* Earnings Card */}
            <div className="glass-card p-5 sm:p-6 relative overflow-hidden flex-1">
              <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-text-muted flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Total Earnings</span>
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold gradient-text mb-3">
                    {formatCurrency(profile.stats.totalEarned)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <span className="text-xs text-text-muted">
                      Pending Earnings <span className="text-warning font-bold">{formatCurrency(pendingEarnings)}</span>
                    </span>
                  </div>
                </div>
                {/* My Activity Button — green like reference */}
                <Link
                  href="/campaigns"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/15 text-success text-xs font-bold hover:bg-success/25 transition-all border border-success/20 flex-shrink-0 self-start sm:self-auto w-fit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  My Activity
                </Link>
              </div>

              {/* Tier info if available */}
              {profile.tierInfo && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{profile.tierInfo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{profile.tierInfo.label} Creator</span>
                        {profile.tierInfo.rateBonus > 0 && (
                          <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                            +{profile.tierInfo.rateBonus}% bonus
                          </span>
                        )}
                      </div>
                      {profile.tierInfo.nextTier && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-[10px] text-text-muted mb-1">
                            <span>Next: {profile.tierInfo.nextTier.tier.charAt(0).toUpperCase() + profile.tierInfo.nextTier.tier.slice(1)}</span>
                            <span>{profile.stats.totalVideos}/{profile.tierInfo.nextTier.required}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(100, (profile.stats.totalVideos / profile.tierInfo.nextTier.required) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 text-center">
                <div className="text-xs text-text-muted mb-1">Total Views</div>
                <div className="text-xl font-extrabold">{formatNumber(profile.stats.totalViews)}</div>
                <div className="flex justify-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {formatNumber(profile.stats.totalViews)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/></svg> 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> 0
                  </span>
                </div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-xs text-text-muted mb-1">Submissions</div>
                <div className="text-xl font-extrabold">{profile.stats.totalVideos}</div>
                <div className="flex justify-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}



      {/* ═══ Campaign Section Header ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-light"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h1 className="text-2xl font-bold">CAMPAIGNS</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Sort By</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field !w-auto !py-2 !px-3 text-sm"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {typeFilters.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeType === type
                ? "bg-accent/15 text-accent-light border border-border-hover"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/50 border border-transparent"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Platform Checkboxes */}
      <div className="flex flex-wrap gap-4 mb-6">
        {platformFilters.map((platform) => (
          <label key={platform} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={activePlatforms.has(platform)}
              onChange={() => togglePlatform(platform)}
              className="w-4 h-4 rounded bg-bg-tertiary border-border accent-accent"
            />
            {platform}
          </label>
        ))}
        <span className="text-sm text-text-muted ml-2">
          {filteredCampaigns.length} from {campaigns.length} campaigns
        </span>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-4 overflow-hidden animate-pulse flex gap-4 h-[116px]">
              <div className="w-20 h-20 bg-bg-tertiary rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-light"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-text-muted text-sm">Check back later for new campaigns!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((campaign) => (
            <Link
              href={`/dashboard/detail/${campaign._id}`}
              key={campaign._id}
              className="glass-card !p-4 block group hover:border-accent/30 transition-all relative overflow-hidden"
            >
              {/* Cover & Title Flex Row */}
              <div className="flex gap-4 items-start mb-4">
                {/* Cover Thumbnail */}
                <div className="relative w-20 h-20 rounded-2xl bg-bg-tertiary overflow-hidden flex-shrink-0">
                  {campaign.coverImage ? (
                    <img
                      src={campaign.coverImage}
                      alt={campaign.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 [backface-visibility:hidden]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                        <path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                  )}
                  {/* Category text overlay on bottom of thumbnail */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] py-1 text-center">
                    <span className={cn(
                      "text-[9px] font-extrabold uppercase tracking-wider",
                      campaign.type === 'music' ? 'text-pink' :
                      campaign.type === 'clipping' ? 'text-success' :
                      campaign.type === 'logo' ? 'text-info' :
                      campaign.type === 'ugc' ? 'text-warning' : 'text-accent-light'
                    )}>
                      {campaign.type}
                    </span>
                  </div>
                </div>

                {/* Title & Platform */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-accent-light transition-colors">
                    {campaign.title}
                  </h3>
                  
                  {/* Platform Icons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {campaign.supportedPlatforms?.map((p) => {
                      const platformLower = p.toLowerCase();
                      if (platformLower === "tiktok") {
                        return (
                          <svg key={p} className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <title>TikTok</title>
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.2-1-2.02-2.44-2.24-3.99-.01 1.72-.01 3.43-.01 5.14v6.86c-.07 1.71-.56 3.47-1.74 4.72-1.34 1.48-3.41 2.27-5.42 2.29-2.08.06-4.22-.64-5.69-2.14C1.58 19.86.77 17.57.9 15.22c.07-2.16.94-4.32 2.65-5.66 1.6-1.3 3.79-1.84 5.86-1.5v4.05c-1.22-.24-2.58-.1-3.6.59-1.07.67-1.72 1.94-1.73 3.2-.01 1.25.59 2.5 1.59 3.23 1.09.85 2.61 1.01 3.89.44 1.11-.46 1.84-1.57 1.94-2.77.02-2.31.01-4.62.01-6.93V.02z" />
                          </svg>
                        );
                      }
                      if (platformLower === "instagram") {
                        return (
                          <svg key={p} className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <title>Instagram</title>
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                          </svg>
                        );
                      }
                      if (platformLower === "youtube") {
                        return (
                          <svg key={p} className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <title>YouTube</title>
                            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        );
                      }
                      return <span key={p} className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded capitalize">{p}</span>;
                    })}
                  </div>
                </div>
              </div>

              {/* Active & Rate Row */}
              <div className="flex justify-between items-end text-xs mb-4">
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Active</div>
                  <div className="font-bold text-sm">
                    <span className="text-text-primary">{budgetPercent(campaign)}%</span>
                    <span className="text-text-muted font-normal"> / {formatCompactCurrency(campaign.totalBudget)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Rate</div>
                  <div className="font-bold text-sm">
                    <span className="text-text-primary">{formatCompactCurrency(campaign.ratePerMillionViews)}</span>
                    <span className="text-text-muted font-normal"> / 1M</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-tertiary">
                <div
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${Math.min(100, budgetPercent(campaign))}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
