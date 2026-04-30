"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, censorUsername } from "@/lib/utils";

interface Campaign {
  _id: string;
  title: string;
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
  totalCreators: number;
  totalSubmissions: number;
  supportedPlatforms: string[];
  contentType: string;
  sounds: { title: string; soundUrl: string; videoReferenceUrl: string }[];
  discordInviteUrl: string;
  startDate: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  submissions: number;
  earned: number;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then((r) => r.json()),
      fetch(`/api/campaigns/${id}/leaderboard`).then((r) => r.json()).catch(() => ({ leaderboard: [] })),
    ]).then(([campData, lbData]) => {
      if (campData.success) setCampaign(campData.campaign);
      if (lbData.leaderboard) setLeaderboard(lbData.leaderboard);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitMsg(null);

    try {
      const res = await fetch(`/api/campaigns/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: submitUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitMsg({ type: "success", text: "Video submitted successfully! It will be reviewed shortly." });
      setSubmitUrl("");
    } catch (err: unknown) {
      setSubmitMsg({ type: "error", text: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-pulse">🔮</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Campaign not found</h2>
        <Link href="/dashboard" className="text-accent-light hover:underline text-sm">← Back to campaigns</Link>
      </div>
    );
  }

  const budgetPercent = Math.round((campaign.budgetUsed / campaign.totalBudget) * 100);

  const getTrophyIcon = (rank: number) => {
    if (rank === 1) return <span className="trophy-gold text-xl">🏆</span>;
    if (rank === 2) return <span className="trophy-silver text-xl">🥈</span>;
    if (rank === 3) return <span className="trophy-bronze text-xl">🥉</span>;
    return <span className="text-text-muted font-bold">{rank}</span>;
  };

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-secondary transition-colors inline-flex items-center gap-1 mb-6">
        ← Back to campaigns
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Campaign Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="glass-card overflow-hidden">
            {/* Cover */}
            <div className="relative h-48 md:h-64 bg-bg-tertiary">
              {campaign.coverImage ? (
                <img src={campaign.coverImage} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🎵</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary/90 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex gap-2 mb-2">
                  <span className={`badge badge-${campaign.type}`}>{campaign.type}</span>
                  <span className={`badge badge-${campaign.status}`}>{campaign.status}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold">{campaign.title}</h1>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Rate per 1M Views", value: formatCurrency(campaign.ratePerMillionViews), highlight: true },
                { label: "Total Budget", value: formatCurrency(campaign.totalBudget) },
                { label: "Creators", value: formatNumber(campaign.totalCreators) },
                { label: "Submissions", value: formatNumber(campaign.totalSubmissions) },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className={`text-xl font-extrabold ${stat.highlight ? "gradient-text" : ""}`}>{stat.value}</div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Budget Progress */}
            <div className="px-6 pb-6">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>Budget Used</span>
                <span>{budgetPercent}% — {formatCurrency(campaign.budgetUsed)} / {formatCurrency(campaign.totalBudget)}</span>
              </div>
              <div className="progress-bar !h-3 !rounded-lg">
                <div className="progress-fill !rounded-lg" style={{ width: `${budgetPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">Campaign Description</h2>
            <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: campaign.description || "<p>No description provided.</p>" }} />
          </div>

          {/* Sounds */}
          {campaign.sounds.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">🎵 Campaign Sounds</h2>
              <div className="space-y-3">
                {campaign.sounds.map((sound, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-bg-primary/50 border border-border">
                    <div>
                      <div className="font-medium text-sm">{sound.title}</div>
                      <a href={sound.soundUrl} target="_blank" className="text-xs text-accent-light hover:underline">Open on TikTok →</a>
                    </div>
                    {sound.videoReferenceUrl && (
                      <a href={sound.videoReferenceUrl} target="_blank" className="text-xs text-text-muted hover:text-text-secondary">
                        Reference Video
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">📋 Requirements</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Content Type", value: campaign.contentType },
                { label: "Min. Views", value: formatNumber(campaign.minViews) },
                { label: "Max Earnings / Creator", value: formatCurrency(campaign.maxEarningsPerCreator) },
                { label: "Max Earnings / Post", value: formatCurrency(campaign.maxEarningsPerPost) },
                { label: "Max Submissions / Account", value: campaign.maxSubmissionsPerAccount.toString() },
                { label: "Platforms", value: campaign.supportedPlatforms.join(", ") },
              ].map((req) => (
                <div key={req.label} className="p-3 rounded-xl bg-bg-primary/50 border border-border">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">{req.label}</div>
                  <div className="text-sm font-bold mt-1 capitalize">{req.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Submit + Leaderboard */}
        <div className="space-y-6">
          {/* Submit Video */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">🎬 Submit Your Video</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">TikTok Video URL</label>
                <input
                  type="url"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  className="input-field text-sm"
                  placeholder="https://www.tiktok.com/@user/video/..."
                  required
                />
              </div>
              <button type="submit" disabled={submitLoading} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
                {submitLoading ? "Submitting..." : "Submit Video"}
              </button>
            </form>

            {submitMsg && (
              <div className={`mt-4 p-3 rounded-xl text-sm ${submitMsg.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"}`}>
                {submitMsg.text}
              </div>
            )}

            {campaign.discordInviteUrl && (
              <a href={campaign.discordInviteUrl} target="_blank" className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#5865F2]/30 text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors text-sm font-medium">
                💬 Join Discord
              </a>
            )}
          </div>

          {/* Creator Leaderboard */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 gradient-text">Creator Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No submissions yet. Be the first!</p>
            ) : (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_60px_80px] text-[10px] text-text-muted uppercase tracking-wider px-3 pb-2 border-b border-border">
                  <span>#</span><span>Creator</span><span className="text-center">Subs</span><span className="text-right">Earned</span>
                </div>
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className={`grid grid-cols-[40px_1fr_60px_80px] items-center px-3 py-3 rounded-xl text-sm transition-colors ${entry.rank <= 3 ? "bg-bg-primary/50" : "hover:bg-bg-primary/30"}`}>
                    <span className="flex items-center justify-center">{getTrophyIcon(entry.rank)}</span>
                    <span className="font-mono text-xs">{censorUsername(entry.username)}</span>
                    <span className="text-center text-text-muted text-xs">{entry.submissions}</span>
                    <span className="text-right font-bold text-xs text-success">{formatCurrency(entry.earned)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
