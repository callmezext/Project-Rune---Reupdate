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

const StatIcon = ({ children, bg }: { children: React.ReactNode; bg: string }) => (
  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{children}</div>
);

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

  const stats = [
    { label: "Total Submissions", value: submissions.length.toString(), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, bg: "bg-purple-500/15 text-purple-400" },
    { label: "Total Views", value: formatNumber(totalViews), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, bg: "bg-blue-500/15 text-blue-400" },
    { label: "Total Earned", value: formatCurrency(totalEarned), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, bg: "bg-emerald-500/15 text-emerald-400" },
    { label: "Approved", value: submissions.filter((s) => s.status === "approved" || s.status === "paid_out").length.toString(), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, bg: "bg-green-500/15 text-green-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Campaigns</h1>
      <p className="text-sm text-text-muted mb-6">Track your submissions and earnings</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <StatIcon bg={stat.bg}>{stat.icon}</StatIcon>
            </div>
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
              filter === f ? "bg-accent/15 text-accent-light border border-border-hover" : "text-text-muted hover:bg-bg-tertiary border border-transparent"
            )}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Submissions */}
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
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
          <p className="text-text-muted text-sm mb-5">Start by joining a campaign!</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:shadow-lg hover:shadow-accent/25 transition-all">
            Explore Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub._id} className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-bg-tertiary overflow-hidden flex-shrink-0">
                {sub.campaignCover ? (
                  <img src={sub.campaignCover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-muted"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{sub.campaignTitle}</div>
                <a href={sub.videoUrl} target="_blank" className="text-xs text-accent-light hover:underline truncate block">{sub.videoUrl}</a>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-center sm:text-left"><div className="text-text-muted">Views</div><div className="font-bold">{formatNumber(sub.views)}</div></div>
                <div className="text-center sm:text-left"><div className="text-text-muted">Earned</div><div className="font-bold text-success">{formatCurrency(sub.earned)}</div></div>
                <span className={`badge ${statusColors[sub.status] || ""} text-center`}>{sub.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
