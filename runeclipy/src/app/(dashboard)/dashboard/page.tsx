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
    .filter((c) => activePlatforms.size === 0 || c.supportedPlatforms?.some((p) => activePlatforms.has(p)))
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
                    <span className="text-base">✏️</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    member since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  {/* Approval Rate Badge */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20">
                    <span className="text-success text-xs">✅</span>
                    <span className="text-xs font-semibold text-success">
                      Approval Rate: {profile.stats.totalVideos > 0 ? "Active" : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row — matches reference: Followers | Pages | Campaigns */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-info text-xs">👁️</span>
                    <span className="text-[10px] text-text-muted font-medium">Total Views</span>
                  </div>
                  <div className="text-lg font-extrabold">{formatNumber(profile.stats.totalViews)}</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-accent-light text-xs">📄</span>
                    <span className="text-[10px] text-text-muted font-medium">Videos</span>
                  </div>
                  <div className="text-lg font-extrabold">{profile.stats.totalVideos}</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-pink text-xs">🎬</span>
                    <span className="text-[10px] text-text-muted font-medium">Campaigns</span>
                  </div>
                  <div className="text-lg font-extrabold">{campaigns.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Earnings + Quick Stats ── */}
          <div className="flex flex-col gap-4">
            {/* Earnings Card */}
            <div className="glass-card p-5 sm:p-6 relative overflow-hidden flex-1">
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-text-muted">💰 Total Earnings</span>
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
                {/* My Campaigns Button — green like reference */}
                <Link
                  href="/campaigns"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/15 text-success text-xs font-bold hover:bg-success/25 transition-all border border-success/20 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  My Campaigns
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
                    👁️ {formatNumber(profile.stats.totalViews)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    😎 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    🔥 0
                  </span>
                </div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-xs text-text-muted mb-1">Submissions</div>
                <div className="text-xl font-extrabold">{profile.stats.totalVideos}</div>
                <div className="flex justify-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    💬 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    🎯 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-text-muted">
                    📊 0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ Campaign Section Header ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">CAMPAIGNS</h1>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card p-0 overflow-hidden animate-pulse">
              <div className="h-40 bg-bg-tertiary" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                <div className="h-3 bg-bg-tertiary rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl mb-4 block">🎵</span>
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-text-muted text-sm">Check back later for new campaigns!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign._id} className="glass-card overflow-hidden group hover:border-accent/20 transition-all">
              {/* Cover */}
              <div className="relative h-40 bg-bg-tertiary overflow-hidden">
                {campaign.coverImage ? (
                  <img
                    src={campaign.coverImage}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🎵</div>
                )}
                {/* Badges */}
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className={`badge badge-${campaign.type}`}>{campaign.type}</span>
                  {budgetPercent(campaign) < 5 && <span className="badge badge-new">New</span>}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-sm mb-3 line-clamp-2 leading-snug min-h-[2.5rem]">{campaign.title}</h3>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Creators</span>
                    <span className="font-medium">{formatNumber(campaign.totalCreators)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Budget</span>
                    <span className="font-bold text-success">{formatCurrency(campaign.totalBudget)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Budget Used</span>
                    <span className="font-medium">{budgetPercent(campaign)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${budgetPercent(campaign)}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Rate per 1M Views</div>
                    <div className="text-base font-extrabold gradient-text">{formatCurrency(campaign.ratePerMillionViews)}</div>
                  </div>
                  <Link
                    href={`/dashboard/detail/${campaign._id}`}
                    className="px-4 py-2 rounded-lg bg-error text-white text-xs font-bold hover:bg-error/80 transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
