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

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-stat-card">
            <div className="admin-shimmer h-5 w-10 mb-3" />
            <div className="admin-shimmer h-8 w-24 mb-2" />
            <div className="admin-shimmer h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6"><div className="admin-shimmer h-40 w-full" /></div>
        <div className="glass-card p-6"><div className="admin-shimmer h-40 w-full" /></div>
      </div>
    </div>
  );
}

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

  if (loading) return <LoadingSkeleton />;

  const statCards = [
    { label: "Total Users", value: formatNumber(stats?.totalUsers || 0), icon: "👥", gradient: "from-blue-500/20 via-blue-600/10 to-transparent" },
    { label: "Active Campaigns", value: stats?.activeCampaigns?.toString() || "0", icon: "🎵", gradient: "from-green-500/20 via-green-600/10 to-transparent" },
    { label: "Total Submissions", value: formatNumber(stats?.totalSubmissions || 0), icon: "🎬", gradient: "from-purple-500/20 via-purple-600/10 to-transparent" },
    { label: "Pending Review", value: stats?.pendingSubmissions?.toString() || "0", icon: "⏳", gradient: "from-yellow-500/20 via-yellow-600/10 to-transparent" },
    { label: "Pending Payouts", value: stats?.pendingPayouts?.toString() || "0", icon: "💸", gradient: "from-pink-500/20 via-pink-600/10 to-transparent" },
    { label: "Platform Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: "💰", gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent" },
  ];

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
  const statusColor: Record<string, string> = {
    active: "text-success",
    paused: "text-warning",
    ended: "text-text-muted"
  };
  const statusDot: Record<string, string> = {
    active: "status-dot--active",
    paused: "status-dot--paused",
    ended: "status-dot--ended"
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="admin-page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time platform analytics & performance metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={card.label} className={`admin-stat-card admin-grid-item bg-gradient-to-br ${card.gradient}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-extrabold tracking-tight mb-1">{card.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-widest font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Submissions Chart */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-sm">Submissions</h3>
              <p className="text-[11px] text-text-muted">Last 30 days • Total: {submissionDays.reduce((a, b) => a + b.count, 0)}</p>
            </div>
            <span className="text-xs font-mono text-accent-light bg-accent/10 px-2 py-1 rounded-lg">📊</span>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {submissionDays.map((d, i) => (
              <div key={i} className="admin-chart-bar">
                <div
                  className="admin-chart-bar-fill bg-accent/60"
                  style={{ height: `${(d.count / maxSub) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
                <div className="admin-chart-tooltip">
                  {d.date.slice(5)}: <strong>{d.count}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-text-muted font-mono">
            <span>{submissionDays[0]?.date.slice(5)}</span>
            <span>{submissionDays[submissionDays.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Users Chart */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-sm">New Users</h3>
              <p className="text-[11px] text-text-muted">Last 30 days • Total: {userDays.reduce((a, b) => a + b.count, 0)}</p>
            </div>
            <span className="text-xs font-mono text-pink bg-pink/10 px-2 py-1 rounded-lg">👥</span>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {userDays.map((d, i) => (
              <div key={i} className="admin-chart-bar">
                <div
                  className="admin-chart-bar-fill bg-pink/60"
                  style={{ height: `${(d.count / maxUser) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
                <div className="admin-chart-tooltip">
                  {d.date.slice(5)}: <strong>{d.count}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-text-muted font-mono">
            <span>{userDays[0]?.date.slice(5)}</span>
            <span>{userDays[userDays.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Campaign Breakdown + Top Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Campaign Status Breakdown */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-5">🎯 Campaign Breakdown</h3>
          {breakdown.length === 0 ? (
            <p className="text-text-muted text-sm">No campaigns yet</p>
          ) : (
            <div className="space-y-4">
              {breakdown.map((b) => {
                const pct = b.totalBudget > 0 ? Math.round((b.budgetUsed / b.totalBudget) * 100) : 0;
                return (
                  <div key={b._id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("status-dot", statusDot[b._id])} />
                        <span className={cn("text-sm font-semibold capitalize", statusColor[b._id] || "text-text-primary")}>{b._id}</span>
                        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-lg">{b.count}</span>
                      </div>
                      <span className="text-xs text-text-muted font-mono">{formatCurrency(b.budgetUsed)} / {formatCurrency(b.totalBudget)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Campaigns */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-5">🏆 Top Campaigns</h3>
          {topCampaigns.length === 0 ? (
            <p className="text-text-muted text-sm">No active campaigns</p>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => (
                <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-primary/30 transition-colors">
                  <span className={cn(
                    "text-lg w-8 text-center font-bold",
                    i === 0 ? "trophy-gold" : i === 1 ? "trophy-silver" : i === 2 ? "trophy-bronze" : "text-text-muted"
                  )}>
                    {i < 3 ? "🏆" : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{typeEmoji[c.type] || "📋"} {c.title}</div>
                    <div className="text-[10px] text-text-muted">{c.totalCreators} creators • {c.totalSubmissions} submissions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono">{formatCurrency(c.budgetUsed)}</div>
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
        <h3 className="font-bold text-sm mb-5">🕐 Recent Submissions</h3>
        {recentSubs.length === 0 ? (
          <p className="text-text-muted text-sm">No submissions yet</p>
        ) : (
          <div className="space-y-1">
            {recentSubs.map((s) => (
              <div key={s._id} className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-bg-primary/30 transition-colors border-b border-border/20 last:border-0">
                <span className={cn("status-dot",
                  s.status === "approved" ? "status-dot--active" :
                  s.status === "rejected" ? "status-dot--error" :
                  "status-dot--pending"
                )} />
                <span className={cn("badge text-[9px]",
                  s.status === "approved" ? "badge-active" :
                  s.status === "rejected" ? "bg-error/20 text-error" :
                  "badge-paused"
                )}>{s.status}</span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold">@{s.userName}</span>
                  <span className="text-text-muted/40">→</span>
                  <span className="text-xs text-text-secondary truncate">{s.campaignTitle}</span>
                </div>
                <span className="text-xs text-text-muted font-mono">{formatNumber(s.views)} views</span>
                <span className="text-[10px] text-text-muted">{new Date(s.submittedAt).toLocaleDateString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
