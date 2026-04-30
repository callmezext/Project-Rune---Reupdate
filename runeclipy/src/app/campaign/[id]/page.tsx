"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface CampaignDetail {
  _id: string; title: string; type: string; status: string;
  totalBudget: number; budgetUsed: number; ratePerMillionViews: number;
  maxEarningsPerCreator: number; maxEarningsPerPost: number;
  maxSubmissionsPerAccount: number; minViews: number; contentType: string;
  description: string; coverImage: string; discordInviteUrl: string;
  sounds: { title: string; soundUrl: string; videoReferenceUrl: string }[];
  totalCreators: number; totalSubmissions: number;
  earningType: string; fixedRatePerPost: number;
  allowOldVideos: boolean; maxVideoAgeHours: number;
  autoApprove: boolean; createdAt: string;
}

interface LeaderboardEntry {
  rank: number; username: string; submissions: number; earned: number;
}

export default function PublicCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"details" | "leaderboard">("details");

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch(`/api/campaigns/${id}/leaderboard`).then(r => r.json()),
    ]).then(([cData, lData]) => {
      if (cData.success) setCampaign(cData.campaign);
      if (lData.success) setLeaderboard(lData.leaderboard || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-4xl animate-pulse">🎵</div>
    </div>
  );

  if (!campaign) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2">Campaign Not Found</h1>
        <Link href="/dashboard" className="text-accent-light hover:underline text-sm">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const budgetPct = campaign.totalBudget > 0 ? Math.round((campaign.budgetUsed / campaign.totalBudget) * 100) : 0;
  const budgetRemaining = campaign.totalBudget - campaign.budgetUsed;
  const typeEmoji: Record<string, string> = { music: "🎵", clipping: "🎬", logo: "🏷️", ugc: "📦" };
  const rankMedal = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-primary" />
        {campaign.coverImage && (
          <div className="absolute inset-0 opacity-10">
            <img src={campaign.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-6 py-16">
          <Link href="/campaigns" className="text-sm text-text-muted hover:text-text-primary mb-6 block">← All Campaigns</Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{typeEmoji[campaign.type] || "📋"}</span>
            <span className={`badge badge-${campaign.status} text-xs`}>{campaign.status}</span>
            {campaign.autoApprove && <span className="badge bg-success/20 text-success text-[10px]">🤖 Auto-Approve</span>}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{campaign.title}</h1>

          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            <span>👥 {campaign.totalCreators} creators</span>
            <span>🎬 {campaign.totalSubmissions} submissions</span>
            <span>💰 {formatCurrency(budgetRemaining)} remaining</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 sticky top-0 bg-bg-primary/80 backdrop-blur-sm py-3 z-10">
          {(["details", "leaderboard"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all",
                tab === t ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:bg-bg-tertiary border border-transparent"
              )}>
              {t === "details" ? "📋 Details" : `🏆 Leaderboard (${leaderboard.length})`}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <div className="space-y-6">
            {/* Description */}
            {campaign.description && (
              <div className="glass-card p-6">
                <h3 className="font-bold text-sm mb-3">📝 Description</h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Rate/1M Views", value: formatCurrency(campaign.ratePerMillionViews || 0), icon: "👁️", show: campaign.earningType !== "per_post" },
                { label: "Fixed/Post", value: formatCurrency(campaign.fixedRatePerPost || 0), icon: "📝", show: campaign.earningType !== "per_view" && (campaign.fixedRatePerPost || 0) > 0 },
                { label: "Max/Creator", value: formatCurrency(campaign.maxEarningsPerCreator || 0), icon: "💎", show: true },
                { label: "Max/Post", value: formatCurrency(campaign.maxEarningsPerPost || 0), icon: "📊", show: true },
                { label: "Min Views", value: formatNumber(campaign.minViews || 0), icon: "👀", show: true },
                { label: "Max Submissions", value: (campaign.maxSubmissionsPerAccount || 3).toString(), icon: "🎬", show: true },
                { label: "Content Type", value: campaign.contentType || "both", icon: "📱", show: true },
                { label: "Video Age", value: campaign.allowOldVideos ? "Any" : `< ${campaign.maxVideoAgeHours || 24}h`, icon: "⏰", show: true },
              ].filter(s => s.show).map((s) => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <span className="text-xl block mb-1">{s.icon}</span>
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-[10px] text-text-muted uppercase">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Budget Progress */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm">💰 Budget</h3>
                <span className="text-sm font-bold">{budgetPct}%</span>
              </div>
              <div className="w-full h-3 bg-bg-primary rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", budgetPct > 90 ? "bg-error" : budgetPct > 70 ? "bg-warning" : "bg-accent")}
                  style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>{formatCurrency(campaign.budgetUsed)} used</span>
                <span>{formatCurrency(budgetRemaining)} left</span>
              </div>
            </div>

            {/* Sounds */}
            {campaign.sounds?.length > 0 && campaign.sounds[0]?.title && (
              <div className="glass-card p-6">
                <h3 className="font-bold text-sm mb-4">🎵 Required Sounds</h3>
                <div className="space-y-3">
                  {campaign.sounds.filter(s => s.title).map((sound, i) => (
                    <div key={i} className="p-4 rounded-xl bg-bg-primary/50 border border-border">
                      <div className="font-medium text-sm mb-1">{sound.title}</div>
                      {sound.soundUrl && (
                        <a href={sound.soundUrl} target="_blank" className="text-xs text-accent-light hover:underline block mb-1">🔗 Sound Link</a>
                      )}
                      {sound.videoReferenceUrl && (
                        <a href={sound.videoReferenceUrl} target="_blank" className="text-xs text-accent-light hover:underline block">📹 Reference Video</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discord */}
            {campaign.discordInviteUrl && (
              <a href={campaign.discordInviteUrl} target="_blank"
                className="glass-card p-5 flex items-center gap-4 hover:border-accent/30 transition-all block">
                <span className="text-2xl">💬</span>
                <div>
                  <div className="font-bold text-sm">Join Discord</div>
                  <div className="text-xs text-text-muted">Chat with other creators & get support</div>
                </div>
                <span className="ml-auto text-text-muted">→</span>
              </a>
            )}

            {/* Submit CTA */}
            {campaign.status === "active" && budgetRemaining > 0 && (
              <div className="glass-card p-8 text-center bg-gradient-to-br from-accent/10 to-pink/10">
                <h3 className="text-xl font-bold mb-2">Ready to earn? 🚀</h3>
                <p className="text-sm text-text-muted mb-6">Submit your TikTok video using the required sound and start earning!</p>
                <Link href={`/campaigns/${id}`} className="btn-gradient !rounded-xl text-sm !py-3 !px-8 inline-block">
                  Submit Video →
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Leaderboard Tab */
          <div className="glass-card p-6">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="font-bold mb-1">No creators yet</h3>
                <p className="text-sm text-text-muted">Be the first to submit and claim the top spot!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className={cn(
                    "flex items-center gap-4 p-4 rounded-xl transition-all",
                    entry.rank <= 3 ? "bg-gradient-to-r from-accent/5 to-transparent border border-accent/10" : "hover:bg-bg-primary/30"
                  )}>
                    <div className="text-2xl w-10 text-center flex-shrink-0">
                      {entry.rank <= 3 ? rankMedal[entry.rank - 1] : <span className="text-sm text-text-muted font-bold">#{entry.rank}</span>}
                    </div>
                    <div className="flex-1">
                      <div className={cn("font-bold", entry.rank === 1 && "text-lg gradient-text")}>@{entry.username}</div>
                      <div className="text-xs text-text-muted">{entry.submissions} submissions</div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-bold", entry.rank <= 3 ? "text-success text-lg" : "text-success")}>
                        {formatCurrency(entry.earned)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
