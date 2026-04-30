"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import Link from "next/link";

interface Submission {
  _id: string;
  campaignTitle: string;
  campaignCover: string;
  videoUrl: string;
  views: number;
  earned: number;
  status: string;
  submittedAt: string;
}

const statusColors: Record<string, string> = {
  pending: "badge-paused",
  approved: "badge-active",
  rejected: "bg-error/20 text-error",
  paid_out: "badge-music",
};

export default function MyCampaignsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSubmissions(data.submissions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);
  const totalEarned = submissions.reduce((sum, s) => sum + s.earned, 0);
  const totalViews = submissions.reduce((sum, s) => sum + s.views, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Campaigns</h1>
      <p className="text-sm text-text-muted mb-6">Track your submissions and earnings</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Submissions", value: submissions.length.toString(), icon: "🎬" },
          { label: "Total Views", value: formatNumber(totalViews), icon: "👁️" },
          { label: "Total Earned", value: formatCurrency(totalEarned), icon: "💰" },
          { label: "Approved", value: submissions.filter((s) => s.status === "approved" || s.status === "paid_out").length.toString(), icon: "✅" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-lg font-extrabold">{stat.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "approved", "rejected", "paid_out"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize",
              filter === f ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:bg-bg-tertiary border border-transparent"
            )}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse flex gap-4">
              <div className="w-16 h-16 bg-bg-tertiary rounded-xl" />
              <div className="flex-1 space-y-2"><div className="h-4 bg-bg-tertiary rounded w-1/2" /><div className="h-3 bg-bg-tertiary rounded w-1/3" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">📭</span>
          <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
          <p className="text-text-muted text-sm mb-4">Start by joining a campaign!</p>
          <Link href="/dashboard" className="btn-gradient !rounded-xl text-sm !py-2.5 !px-6">Explore Campaigns</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub._id} className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-bg-tertiary overflow-hidden flex-shrink-0">
                {sub.campaignCover ? (
                  <img src={sub.campaignCover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{sub.campaignTitle}</div>
                <a href={sub.videoUrl} target="_blank" className="text-xs text-accent-light hover:underline truncate block">{sub.videoUrl}</a>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="text-center"><div className="text-text-muted">Views</div><div className="font-bold">{formatNumber(sub.views)}</div></div>
                <div className="text-center"><div className="text-text-muted">Earned</div><div className="font-bold text-success">{formatCurrency(sub.earned)}</div></div>
                <span className={`badge ${statusColors[sub.status] || ""}`}>{sub.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
