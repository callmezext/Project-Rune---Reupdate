"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

interface CampaignDetail {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  description: string;
  type: string;
  status: string;
  totalBudget: number;
  budgetUsed: number;
  ratePerMillionViews: number;
  maxEarningsPerCreator: number;
  maxEarningsPerPost: number;
  maxSubmissionsPerAccount: number;
  minViews: number;
  minEngagementRate: number;
  totalCreators: number;
  totalSubmissions: number;
  supportedPlatforms: string[];
  discordInviteUrl: string;
  sounds: { title: string; soundUrl: string; videoReferenceUrl: string }[];
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

  // Modal Detail States
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<CampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showSubmitInput, setShowSubmitInput] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchCampaigns();
    fetchProfile();
  }, []);

  // Toggle body class when modal is open to apply blur
  useEffect(() => {
    if (selectedCampaignId) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [selectedCampaignId]);

  // Fetch campaign details on ID change
  useEffect(() => {
    if (!selectedCampaignId) {
      setSelectedCampaignDetail(null);
      return;
    }
    setDetailLoading(true);
    setSubmitMsg(null);
    setSubmitUrl("");
    setShowSubmitInput(false);
    setPlayingVideoUrl(null);

    fetch(`/api/campaigns/${selectedCampaignId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSelectedCampaignDetail(data.campaign);
        } else {
          console.error("Failed to fetch campaign detail:", data.error);
        }
      })
      .catch((err) => console.error("Error fetching campaign detail:", err))
      .finally(() => setDetailLoading(false));
  }, [selectedCampaignId]);

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

  const budgetPercent = (c: Campaign | CampaignDetail) => c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;

  // Next / Prev Navigation inside Modal
  const handleNextCampaign = () => {
    if (filteredCampaigns.length <= 1) return;
    const currentIndex = filteredCampaigns.findIndex((c) => c._id === selectedCampaignId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filteredCampaigns.length;
    setSelectedCampaignId(filteredCampaigns[nextIndex]._id);
  };

  const handlePrevCampaign = () => {
    if (filteredCampaigns.length <= 1) return;
    const currentIndex = filteredCampaigns.findIndex((c) => c._id === selectedCampaignId);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + filteredCampaigns.length) % filteredCampaigns.length;
    setSelectedCampaignId(filteredCampaigns[prevIndex]._id);
  };

  // Submit Content via Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setSubmitLoading(true);
    setSubmitMsg(null);

    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: submitUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitMsg({ type: "success", text: "Video submitted successfully! It will be reviewed shortly." });
      setSubmitUrl("");
      setTimeout(() => {
        setShowSubmitInput(false);
        setSubmitMsg(null);
      }, 2500);
    } catch (err: unknown) {
      setSubmitMsg({ type: "error", text: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helper to parse description HTML into requirements list items
  const parseDescriptionToRequirements = (html: string) => {
    if (!html) return [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const matches = [];
    let match;
    while ((match = liRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text) matches.push(text);
    }
    
    if (matches.length === 0) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = pRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (text) matches.push(text);
      }
    }
    
    if (matches.length === 0) {
      const plainText = html.replace(/<[^>]*>/g, '').trim();
      return plainText.split('\n').map(line => line.trim()).filter(Boolean);
    }
    return matches;
  };

  const getRequirementStatus = (text: string): 'check' | 'cross' => {
    const upperText = text.toUpperCase();
    const negativeKeywords = [
      "LOW QUALITY",
      "NO MOVIE",
      "NO MOVIES",
      "ONLY NICHES LISTED",
      "DON'T",
      "DO NOT",
      "NOT ALLOWED",
      "FORBIDDEN",
      "PROHIBITED",
      "BANNED",
      "AVOID",
      "ILLEGAL",
      "NO "
    ];
    const isNegative = negativeKeywords.some(keyword => upperText.includes(keyword));
    return isNegative ? 'cross' : 'check';
  };

  const getTikTokVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  // Calculate pending earnings (from submissions that are approved but not paid out)
  const pendingEarnings = 0; // This would come from API if available

  return (
    <div>
      {/* ═══ Welcome Header ═══ */}
      <h1 className="text-base sm:text-2xl font-bold mb-3 sm:mb-5">
        Welcome Back, <span className="gradient-text">{profile?.nickname || profile?.username || "Creator"}</span>
      </h1>

      {/* ═══ Profile Summary Card ═══ */}
      {profileLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4 sm:mb-8 animate-pulse">
          <div className="glass-card p-4 h-32 sm:h-52 bg-bg-tertiary/30" />
          <div className="glass-card p-4 h-32 sm:h-52 bg-bg-tertiary/30" />
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4 sm:mb-8">
          {/* ── Left: User Identity Card ── */}
          <div className="glass-card p-0 overflow-hidden relative">
            {/* Glossy gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

            <div className="relative p-3 sm:p-5">
              {/* User info row */}
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div className="w-10 h-10 sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-bg-tertiary to-bg-secondary flex items-center justify-center text-xl sm:text-3xl font-bold flex-shrink-0 border border-border/50">
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-xl font-bold truncate">{profile.nickname}</h2>
                    <Link href="/profile" title="Edit Profile" className="p-1 rounded-md hover:bg-bg-tertiary transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted hover:text-accent-light transition-colors"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </Link>
                  </div>
                  <p className="text-[10px] sm:text-xs text-text-muted mt-0.5">
                    since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                  {/* Approval Rate Badge */}
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 border border-success/20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-xs font-semibold text-success">
                      Approval Rate: {profile.stats.totalVideos > 0 ? "Active" : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1 sm:gap-3 mb-3">
                <div className="text-center p-1.5 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-info"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Views</span>
                  </div>
                  <div className="text-xs sm:text-lg font-extrabold">{formatNumber(profile.stats.totalViews)}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Videos</span>
                  </div>
                  <div className="text-xs sm:text-lg font-extrabold">{profile.stats.totalVideos}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-bg-primary/40 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <span className="text-[9px] sm:text-[10px] text-text-muted font-medium">Campaigns</span>
                  </div>
                  <div className="text-xs sm:text-lg font-extrabold">{campaigns.length}</div>
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
          <div className="flex flex-col gap-3">
            {/* Earnings Card */}
            <div className="glass-card p-3 sm:p-6 relative overflow-hidden flex-1">
              <div className="relative flex flex-row items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-text-muted flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Total Earnings</span>
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  </div>
                  <div className="text-2xl sm:text-4xl font-extrabold gradient-text mb-2">
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-success/15 text-success text-[10px] sm:text-xs font-bold hover:bg-success/25 transition-all border border-success/20 flex-shrink-0 self-start w-fit"
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

            {/* Platform Stats Grid — 3 col × 2 row */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Row 1 */}
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Views</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight">{formatNumber(profile.stats.totalViews)}</div>
              </div>
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Videos</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight">{profile.stats.totalVideos}</div>
              </div>
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Active</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight">{campaigns.length}</div>
              </div>
              {/* Row 2 */}
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Earned</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight text-success">{formatCurrency(profile.stats.totalEarned)}</div>
              </div>
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Pending</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight text-warning">{formatCurrency(pendingEarnings)}</div>
              </div>
              <div className="glass-card p-2 text-center">
                <div className="text-[9px] text-text-muted mb-0.5 uppercase tracking-wider">Tier</div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight">{profile.tierInfo?.emoji ?? '🥉'} <span className="text-[8px] text-text-muted">{profile.tierInfo?.tier ?? 'bronze'}</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}



      {/* ═══ Campaign Section Header ═══ */}
      <div className="flex flex-row justify-between items-center gap-2 mb-3 sm:mb-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-light"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h2 className="text-base sm:text-2xl font-bold">CAMPAIGNS</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted hidden sm:inline">Sort By</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field !w-auto !py-1.5 !px-2 text-xs sm:!py-2 sm:!px-3 sm:text-sm"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters + Platform Row */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-4">
        {typeFilters.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all",
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
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-6">
        {platformFilters.map((platform) => (
          <label key={platform} className="flex items-center gap-1.5 text-[10px] sm:text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={activePlatforms.has(platform)}
              onChange={() => togglePlatform(platform)}
              className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-bg-tertiary border-border accent-accent"
            />
            {platform}
          </label>
        ))}
        <span className="text-[10px] sm:text-sm text-text-muted">
          {filteredCampaigns.length}/{campaigns.length}
        </span>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-2.5 sm:p-4 overflow-hidden animate-pulse flex gap-2 sm:gap-4 h-[90px] sm:h-[116px]">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-bg-tertiary rounded-xl sm:rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2 sm:space-y-3 py-1">
                <div className="h-3 bg-bg-tertiary rounded w-3/4" />
                <div className="h-2 bg-bg-tertiary rounded w-1/4" />
                <div className="h-2 bg-bg-tertiary rounded w-1/2" />
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
          {filteredCampaigns.map((campaign) => (
            <Link
              href={`/dashboard/detail/${campaign._id}`}
              onClick={(e) => {
                e.preventDefault();
                setSelectedCampaignId(campaign._id);
              }}
              key={campaign._id}
              className="glass-card !p-2 sm:!p-4 block group hover:border-accent/30 transition-all relative overflow-hidden cursor-pointer"
            >
              {/* Cover & Title Flex Row */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4 sm:items-start mb-2 sm:mb-4">
                {/* Cover Thumbnail */}
                <div className="relative w-full sm:w-20 h-24 sm:h-20 rounded-xl sm:rounded-2xl bg-bg-tertiary overflow-hidden flex-shrink-0">
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
              <div className="flex justify-between items-end text-xs mb-2 sm:mb-4">
                <div>
                  <div className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Active</div>
                  <div className="font-bold text-[10px] sm:text-sm">
                    <span className="text-text-primary">{budgetPercent(campaign)}%</span>
                    <span className="text-text-muted font-normal hidden sm:inline"> / {formatCompactCurrency(campaign.totalBudget)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Rate</div>
                  <div className="font-bold text-[10px] sm:text-sm">
                    <span className="text-text-primary">{formatCompactCurrency(campaign.ratePerMillionViews)}</span>
                    <span className="text-text-muted font-normal hidden sm:inline"> / 1M</span>
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

      {/* ═══ Campaign Detail Modal Popup ═══ */}
      {selectedCampaignId && mounted && createPortal(
        <div
          onClick={() => setSelectedCampaignId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          {/* Navigation Arrow Left */}
          {filteredCampaigns.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevCampaign();
              }}
              className="fixed left-4 lg:left-[calc(50%-330px)] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bg-secondary/60 hover:bg-bg-secondary border border-border/50 flex items-center justify-center text-text-primary hover:text-accent-light transition-all cursor-pointer z-50 shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Navigation Arrow Right */}
          {filteredCampaigns.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextCampaign();
              }}
              className="fixed right-4 lg:right-[calc(50%-330px)] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bg-secondary/60 hover:bg-bg-secondary border border-border/50 flex items-center justify-center text-text-primary hover:text-accent-light transition-all cursor-pointer z-50 shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Modal Container */}
          <div
            className="relative w-full max-w-[500px] h-[85vh] bg-[#151922] border border-gray-800 rounded-[28px] overflow-hidden flex flex-col shadow-2xl animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-36">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                  <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
                  <span className="text-xs text-text-muted">Loading details...</span>
                </div>
              ) : selectedCampaignDetail ? (
                <>
                  {/* Campaign Header Info */}
                  <div className="flex gap-4 items-start mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-bg-tertiary overflow-hidden flex-shrink-0 border border-border/50">
                      {selectedCampaignDetail.coverImage ? (
                        <img src={selectedCampaignDetail.coverImage} alt={selectedCampaignDetail.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30 text-xl">🎵</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-text-primary leading-tight truncate">{selectedCampaignDetail.title}</h2>
                      <p className="text-xs font-bold text-pink mt-1 uppercase tracking-wider">
                        {selectedCampaignDetail.type}
                      </p>
                    </div>
                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedCampaignId(null)}
                      className="p-1.5 rounded-lg bg-bg-tertiary/40 hover:bg-bg-tertiary/80 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Active / Rate stats */}
                  <div className="flex justify-between items-end text-xs mb-1">
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Active</div>
                      <div className="font-extrabold text-sm text-text-primary">
                        {budgetPercent(selectedCampaignDetail)}% <span className="text-text-muted font-normal text-xs">/ {formatCompactCurrency(selectedCampaignDetail.totalBudget)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Rate</div>
                      <div className="font-extrabold text-sm text-text-primary">
                        {formatCompactCurrency(selectedCampaignDetail.ratePerMillionViews)} <span className="text-text-muted font-normal text-xs">/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="mb-5">
                    <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-success transition-all duration-500" style={{ width: `${Math.min(100, budgetPercent(selectedCampaignDetail))}%` }} />
                    </div>
                    <div className="text-[9px] text-text-muted font-semibold">Budget filled</div>
                  </div>

                  {/* Platform Caps Grid */}
                  <div className="grid grid-cols-4 gap-2 py-4 border-t border-b border-border/30 mb-6 text-center">
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1.5">Platforms</div>
                      <div className="flex justify-center items-center h-5">
                        {selectedCampaignDetail.supportedPlatforms?.map((p) => {
                          if (p.toLowerCase() === "tiktok") {
                            return (
                              <svg key={p} className="w-3.5 h-3.5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.2-1-2.02-2.44-2.24-3.99-.01 1.72-.01 3.43-.01 5.14v6.86c-.07 1.71-.56 3.47-1.74 4.72-1.34 1.48-3.41 2.27-5.42 2.29-2.08.06-4.22-.64-5.69-2.14C1.58 19.86.77 17.57.9 15.22c.07-2.16.94-4.32 2.65-5.66 1.6-1.3 3.79-1.84 5.86-1.5v4.05c-1.22-.24-2.58-.1-3.6.59-1.07.67-1.72 1.94-1.73 3.2-.01 1.25.59 2.5 1.59 3.23 1.09.85 2.61 1.01 3.89.44 1.11-.46 1.84-1.57 1.94-2.77.02-2.31.01-4.62.01-6.93V.02z" />
                              </svg>
                            );
                          }
                          if (p.toLowerCase() === "instagram") {
                            return (
                              <svg key={p} className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                              </svg>
                            );
                          }
                          if (p.toLowerCase() === "youtube") {
                            return (
                              <svg key={p} className="w-3.5 h-3.5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            );
                          }
                          return <span key={p} className="text-[10px] text-text-secondary font-bold uppercase">{p}</span>;
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1.5">Cap per Post</div>
                      <div className="font-extrabold text-sm text-text-primary">{selectedCampaignDetail.maxEarningsPerPost ? formatCompactCurrency(selectedCampaignDetail.maxEarningsPerPost) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1.5">Cap per Profile</div>
                      <div className="font-extrabold text-sm text-text-primary">{selectedCampaignDetail.maxEarningsPerCreator ? formatCompactCurrency(selectedCampaignDetail.maxEarningsPerCreator) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1.5">Min. Duration</div>
                      <div className="font-extrabold text-sm text-text-primary">—</div>
                    </div>
                  </div>

                  {/* Requirements list */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-text-primary mb-3">Requirements</h3>
                    <div className="space-y-3">
                      {parseDescriptionToRequirements(selectedCampaignDetail.description).map((req, idx) => {
                        const isCheck = getRequirementStatus(req) === 'check';
                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
                            {isCheck ? (
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-[10px] mt-0.5">✓</span>
                            ) : (
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-error/20 text-error flex items-center justify-center font-bold text-[10px] mt-0.5">✕</span>
                            )}
                            <span className={cn(isCheck ? "text-text-primary/90" : "text-text-secondary/80")}>{req}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reference Videos Box */}
                  {selectedCampaignDetail.sounds && selectedCampaignDetail.sounds.some((s) => s.videoReferenceUrl) && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {selectedCampaignDetail.sounds.filter((s) => s.videoReferenceUrl).map((sound, i) => {
                        const isLocal = sound.videoReferenceUrl?.startsWith("/uploads/");
                        const tikTokId = !isLocal ? getTikTokVideoId(sound.videoReferenceUrl) : null;
                        const isPlaying = playingVideoUrl === sound.videoReferenceUrl;
                        return (
                          <div
                            key={i}
                            className="relative aspect-[3/4] bg-bg-tertiary rounded-2xl overflow-hidden border border-border/50 shadow-md group flex flex-col"
                          >
                            {isPlaying && (isLocal || tikTokId) ? (
                              isLocal ? (
                                <video
                                  src={sound.videoReferenceUrl}
                                  className="w-full h-full rounded-2xl object-cover"
                                  controls
                                  autoPlay
                                  playsInline
                                />
                              ) : (
                                <iframe
                                  src={`https://www.tiktok.com/embed/v2/${tikTokId}`}
                                  className="w-full h-full rounded-2xl"
                                  allowFullScreen
                                  allow="autoplay; encrypted-media; fullscreen"
                                  style={{ border: 'none' }}
                                />
                              )
                            ) : (
                              <button
                                onClick={() => {
                                  if (isLocal || tikTokId) {
                                    setPlayingVideoUrl(sound.videoReferenceUrl);
                                  } else {
                                    window.open(sound.videoReferenceUrl, '_blank');
                                  }
                                }}
                                className="w-full h-full text-left relative focus:outline-none block"
                              >
                                {selectedCampaignDetail.coverImage ? (
                                  <div
                                    className="absolute inset-0 bg-cover bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500 opacity-60"
                                    style={{ backgroundImage: `url(${selectedCampaignDetail.coverImage})` }}
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-pink/20 opacity-60" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/35 flex flex-col justify-between p-3 z-10">
                                  <span className="text-[9px] font-bold bg-black/55 text-white px-2 py-0.5 rounded-full w-fit">Ref Video {i+1}</span>
                                  <span className="text-[10px] text-white/90 line-clamp-1 font-semibold">{sound.title}</span>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                  <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-white transition-all duration-300">
                                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discord button */}
                  {selectedCampaignDetail.discordInviteUrl && (
                    <a
                      href={selectedCampaignDetail.discordInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-bg-tertiary/50 transition-all text-xs font-semibold text-text-secondary hover:text-text-primary mb-6"
                    >
                      <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 1-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                      </svg>
                      Campaign Discord
                    </a>
                  )}

                  {/* Available Sounds */}
                  {selectedCampaignDetail.sounds && selectedCampaignDetail.sounds.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-xs text-text-primary mb-3">Available Sounds <span className="ml-1.5 px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-[10px]">{selectedCampaignDetail.sounds.length}</span></h4>
                      <div className="space-y-2">
                        {selectedCampaignDetail.sounds.map((sound, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#1d2432]/60 border border-border/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.2-1-2.02-2.44-2.24-3.99-.01 1.72-.01 3.43-.01 5.14v6.86c-.07 1.71-.56 3.47-1.74 4.72-1.34 1.48-3.41 2.27-5.42 2.29-2.08.06-4.22-.64-5.69-2.14C1.58 19.86.77 17.57.9 15.22c.07-2.16.94-4.32 2.65-5.66 1.6-1.3 3.79-1.84 5.86-1.5v4.05c-1.22-.24-2.58-.1-3.6.59-1.07.67-1.72 1.94-1.73 3.2-.01 1.25.59 2.5 1.59 3.23 1.09.85 2.61 1.01 3.89.44 1.11-.46 1.84-1.57 1.94-2.77.02-2.31.01-4.62.01-6.93V.02z" />
                              </svg>
                              <span className="text-xs font-semibold text-text-secondary truncate">{sound.title}</span>
                            </div>
                            {sound.soundUrl && (
                              <a
                                href={sound.soundUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Criteria detail list */}
                  <div className="space-y-3 mb-6 border-t border-border/30 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Min Followers per Social Profile</span>
                      <span className="font-extrabold text-text-primary">—</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Min Views for Earnings</span>
                      <span className="font-extrabold text-text-primary">{formatNumber(selectedCampaignDetail.minViews)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Max Submissions per Social Account</span>
                      <span className="font-extrabold text-text-primary">{selectedCampaignDetail.maxSubmissionsPerAccount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Min Engagement Rate</span>
                      <span className="font-extrabold text-text-primary">{selectedCampaignDetail.minEngagementRate ? `${selectedCampaignDetail.minEngagementRate}%` : '3%'}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-2 italic text-center w-full">
                      All posts must comply with the Content Requirements.
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-text-muted py-20 text-xs">Campaign not found.</div>
              )}
            </div>

            {/* Sticky Footer */}
            {selectedCampaignDetail && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#151922] border-t border-border/20 p-5 rounded-b-[28px] z-30 shadow-inner">
                <p className="text-[9px] text-text-muted text-center mb-3">
                  Views after submission count toward earnings, submit as soon as you post.
                </p>

                {showSubmitInput ? (
                  <form onSubmit={handleModalSubmit} className="space-y-2.5">
                    <input
                      type="url"
                      value={submitUrl}
                      onChange={(e) => setSubmitUrl(e.target.value)}
                      className="input-field text-xs !py-2.5 !px-3"
                      placeholder="https://www.tiktok.com/@user/video/..."
                      required
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubmitInput(false);
                          setSubmitMsg(null);
                        }}
                        className="flex-1 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {submitLoading ? "Submitting..." : "Confirm Submit"}
                      </button>
                    </div>
                    {submitMsg && (
                      <p className={cn(
                        "text-[10px] text-center font-bold mt-1",
                        submitMsg.type === "success" ? "text-success" : "text-error"
                      )}>
                        {submitMsg.text}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    onClick={() => setShowSubmitInput(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    Submit Content
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
}
