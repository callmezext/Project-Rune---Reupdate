"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  activeCampaigns: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  pendingPayouts: number;
  totalRevenue: number;
}

interface ChartDay { _id: string; count: number; approved?: number; rejected?: number }
interface TopCampaign { _id: string; title: string; totalSubmissions: number; totalCreators: number; budgetUsed: number; totalBudget: number; type: string }
interface RecentSub { _id: string; userName: string; campaignTitle: string; status: string; views: number; submittedAt: string }
interface CampaignBreakdown { _id: string; count: number; totalBudget: number; budgetUsed: number }

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<{ submissionsPerDay: ChartDay[]; usersPerDay: ChartDay[] }>({ submissionsPerDay: [], usersPerDay: [] });
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [recentSubs, setRecentSubs] = useState<RecentSub[]>([]);
  const [breakdown, setBreakdown] = useState<CampaignBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats(d.stats);
          setCharts(d.charts || { submissionsPerDay: [], usersPerDay: [] });
          setTopCampaigns(d.topCampaigns || []);
          setRecentSubs(d.recentSubmissions || []);
          setBreakdown(d.campaignBreakdown || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">📊</div></div>;

  const statCards = [
    { label: "Total Users", value: formatNumber(stats?.totalUsers || 0), icon: "👥", color: "from-blue-500/20 to-blue-600/5" },
    { label: "Active Campaigns", value: stats?.activeCampaigns?.toString() || "0", icon: "🎵", color: "from-green-500/20 to-green-600/5" },
    { label: "Total Submissions", value: formatNumber(stats?.totalSubmissions || 0), icon: "🎬", color: "from-purple-500/20 to-purple-600/5" },
    { label: "Pending Review", value: stats?.pendingSubmissions?.toString() || "0", icon: "⏳", color: "from-yellow-500/20 to-yellow-600/5" },
    { label: "Pending Payouts", value: stats?.pendingPayouts?.toString() || "0", icon: "💸", color: "from-pink-500/20 to-pink-600/5" },
    { label: "Platform Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: "💰", color: "from-emerald-500/20 to-emerald-600/5" },
  ];

  // Fill missing days for chart
  const fillDays = (data: ChartDay[]) => {
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = data.find((x) => x._id === key);
      days.push({ date: key, count: found?.count || 0 });
    }
    return days;
  };

  const submissionDays = fillDays(charts.submissionsPerDay);
  const userDays = fillDays(charts.usersPerDay);
  const maxSub = Math.max(...submissionDays.map((d) => d.count), 1);
  const maxUser = Math.max(...userDays.map((d) => d.count), 1);

  const typeEmoji: Record<string, string> = { music: "🎵", clipping: "🎬", logo: "🏷️", ugc: "📦" };
  const statusColor: Record<string, string> = { active: "text-success", paused: "text-warning", ended: "text-text-muted" };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-sm text-text-muted mb-8">Overview platform activity & analytics</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`glass-card p-5 bg-gradient-to-br ${card.color}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-extrabold mb-0.5">{card.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Submissions Chart */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-1">📊 Submissions (30 Hari)</h3>
          <p className="text-[10px] text-text-muted mb-4">Total: {submissionDays.reduce((a, b) => a + b.count, 0)}</p>
          <div className="flex items-end gap-[2px] h-28">
            {submissionDays.map((d, i) => (
              <div key={i} className="flex-1 group relative">
                <div
                  className="w-full bg-accent/60 hover:bg-accent rounded-t transition-all cursor-pointer"
                  style={{ height: `${(d.count / maxSub) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary border border-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap z-10">
                  {d.date.slice(5)}: {d.count}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-text-muted">
            <span>{submissionDays[0]?.date.slice(5)}</span>
            <span>{submissionDays[submissionDays.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Users Chart */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-1">👥 New Users (30 Hari)</h3>
          <p className="text-[10px] text-text-muted mb-4">Total: {userDays.reduce((a, b) => a + b.count, 0)}</p>
          <div className="flex items-end gap-[2px] h-28">
            {userDays.map((d, i) => (
              <div key={i} className="flex-1 group relative">
                <div
                  className="w-full bg-pink/60 hover:bg-pink rounded-t transition-all cursor-pointer"
                  style={{ height: `${(d.count / maxUser) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary border border-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap z-10">
                  {d.date.slice(5)}: {d.count}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-text-muted">
            <span>{userDays[0]?.date.slice(5)}</span>
            <span>{userDays[userDays.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Campaign Breakdown + Top Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Campaign Status Breakdown */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">🎯 Campaign Breakdown</h3>
          {breakdown.length === 0 ? (
            <p className="text-text-muted text-sm">No campaigns yet</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map((b) => {
                const pct = b.totalBudget > 0 ? Math.round((b.budgetUsed / b.totalBudget) * 100) : 0;
                return (
                  <div key={b._id} className="flex items-center gap-4">
                    <span className={cn("text-sm font-bold capitalize w-16", statusColor[b._id] || "text-text-primary")}>{b._id}</span>
                    <span className="text-xs text-text-muted w-8 text-center">{b.count}</span>
                    <div className="flex-1">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-text-muted w-20 text-right">{formatCurrency(b.budgetUsed)} / {formatCurrency(b.totalBudget)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Campaigns */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">🏆 Top Campaigns</h3>
          {topCampaigns.length === 0 ? (
            <p className="text-text-muted text-sm">No active campaigns</p>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => (
                <div key={c._id} className="flex items-center gap-3">
                  <span className={cn("text-lg w-8 text-center", i === 0 ? "trophy-gold" : i === 1 ? "trophy-silver" : i === 2 ? "trophy-bronze" : "text-text-muted")}>
                    {i < 3 ? "🏆" : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{typeEmoji[c.type] || "📋"} {c.title}</div>
                    <div className="text-[10px] text-text-muted">{c.totalCreators} creators • {c.totalSubmissions} submissions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">{formatCurrency(c.budgetUsed)}</div>
                    <div className="text-[10px] text-text-muted">/ {formatCurrency(c.totalBudget)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-sm mb-4">🕐 Recent Submissions</h3>
        {recentSubs.length === 0 ? (
          <p className="text-text-muted text-sm">No submissions yet</p>
        ) : (
          <div className="space-y-2">
            {recentSubs.map((s) => (
              <div key={s._id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className={cn("badge text-[9px]",
                  s.status === "approved" ? "badge-active" :
                  s.status === "rejected" ? "bg-error/20 text-error" :
                  "badge-paused"
                )}>{s.status}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">@{s.userName}</span>
                  <span className="text-text-muted text-xs mx-2">→</span>
                  <span className="text-xs text-text-secondary truncate">{s.campaignTitle}</span>
                </div>
                <span className="text-xs text-text-muted">{formatNumber(s.views)} views</span>
                <span className="text-[10px] text-text-muted">{new Date(s.submittedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
