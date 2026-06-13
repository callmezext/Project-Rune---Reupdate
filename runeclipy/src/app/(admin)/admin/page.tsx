"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
  const [charts, setCharts] = useState<{
    submissionsPerDay: ChartDay[];
    usersPerDay: ChartDay[];
    revenuePerDay?: { _id: string; revenue: number }[];
  }>({ submissionsPerDay: [], usersPerDay: [], revenuePerDay: [] });
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
          setCharts(d.charts || { submissionsPerDay: [], usersPerDay: [], revenuePerDay: [] });
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
    { label: "Total Users", value: formatNumber(stats?.totalUsers || 0), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, gradient: "from-blue-500/20 via-blue-600/10 to-transparent", iconBg: "bg-blue-500/15 text-blue-400" },
    { label: "Active Campaigns", value: stats?.activeCampaigns?.toString() || "0", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>, gradient: "from-green-500/20 via-green-600/10 to-transparent", iconBg: "bg-emerald-500/15 text-emerald-400" },
    { label: "Total Submissions", value: formatNumber(stats?.totalSubmissions || 0), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, gradient: "from-purple-500/20 via-purple-600/10 to-transparent", iconBg: "bg-purple-500/15 text-purple-400" },
    { label: "Pending Review", value: stats?.pendingSubmissions?.toString() || "0", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, gradient: "from-yellow-500/20 via-yellow-600/10 to-transparent", iconBg: "bg-amber-500/15 text-amber-400" },
    { label: "Pending Payouts", value: stats?.pendingPayouts?.toString() || "0", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, gradient: "from-pink-500/20 via-pink-600/10 to-transparent", iconBg: "bg-pink-500/15 text-pink-400" },
    { label: "Platform Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent", iconBg: "bg-teal-500/15 text-teal-400" },
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

  const fillRevenueDays = (data?: { _id: string; revenue: number }[]) => {
    const days: { date: string; revenue: number }[] = [];
    const safeData = data || [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = safeData.find((x) => x._id === key);
      days.push({ date: key, revenue: found?.revenue || 0 });
    }
    return days;
  };

  const submissionDays = fillDays(charts.submissionsPerDay);
  const userDays = fillDays(charts.usersPerDay);
  const revenueDays = fillRevenueDays(charts.revenuePerDay);
  const maxSub = Math.max(...submissionDays.map((d) => d.count), 1);
  const maxUser = Math.max(...userDays.map((d) => d.count), 1);
  const maxRevenue = Math.max(...revenueDays.map((d) => d.revenue), 1);

  // Generate SVG Line Chart Path for Revenue
  const width = 500;
  const height = 120;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = revenueDays.map((d, i) => {
    const x = padding + (i / 29) * chartWidth;
    const y = padding + chartHeight - (d.revenue / maxRevenue) * chartHeight;
    return { x, y, date: d.date, revenue: d.revenue };
  });

  const pathD = points.reduce((acc, p, i) => {
    return acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "");

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

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

      {/* Section: Core Platform Statistics */}
      <div className="flex items-center gap-2 mb-3.5 mt-5">
        <span className="w-1 h-3.5 bg-accent rounded-full" />
        <h2 className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted">Core Platform Statistics</h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {statCards.map((card, i) => (
          <div key={card.label} className={`admin-stat-card admin-grid-item bg-gradient-to-br ${card.gradient}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${card.iconBg} transition-transform hover:scale-110`}>{card.icon}</div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold tracking-tight mb-1 truncate">{card.value}</div>
            <div className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest font-medium truncate">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Operations & Growth (Col span 2) */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          {/* Section: Analytics & Growth Trends */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-1 h-3.5 bg-info rounded-full" />
              <h2 className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted">Analytics & Growth Trends</h2>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Submissions Chart */}
              <div className="glass-card p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-sm">Submissions</h3>
                    <p className="text-[11px] text-text-muted">Last 30 days • Total: {submissionDays.reduce((a, b) => a + b.count, 0)}</p>
                  </div>
                  <span className="text-xs font-mono text-accent-light bg-accent/10 px-2 py-1 rounded-lg">30d</span>
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
              <div className="glass-card p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-sm">New Users</h3>
                    <p className="text-[11px] text-text-muted">Last 30 days • Total: {userDays.reduce((a, b) => a + b.count, 0)}</p>
                  </div>
                  <span className="text-xs font-mono text-pink bg-pink/10 px-2 py-1 rounded-lg">30d</span>
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

              {/* Revenue Chart */}
              <div className="glass-card p-4 sm:p-6 lg:col-span-2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-sm">Platform Revenue</h3>
                    <p className="text-[11px] text-text-muted">Last 30 days • Total: {formatCurrency(revenueDays.reduce((a, b) => a + b.revenue, 0))}</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">30d</span>
                </div>
                <div className="relative h-32 w-full">
                  {/* SVG Line / Area */}
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area */}
                    {areaD && <path d={areaD} fill="url(#revenueGrad)" />}
                    {/* Line */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* Tooltip Overlay */}
                  <div className="absolute inset-0 flex items-end justify-between gap-[2px]">
                    {points.map((p, i) => (
                      <div key={i} className="admin-chart-bar flex-1 h-full relative group">
                        {/* Invisible interactive bar that triggers tooltip */}
                        <div className="absolute inset-0 bg-transparent cursor-pointer" />
                        {/* Hover indicator dot */}
                        <div 
                          className="absolute w-2 h-2 rounded-full bg-emerald-400 border-2 border-bg-secondary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                          style={{ 
                            left: "50%", 
                            transform: "translate(-50%, -50%)", 
                            top: `${(p.y / height) * 100}%` 
                          }}
                        />
                        {/* Tooltip */}
                        <div className="admin-chart-tooltip">
                          {p.date.slice(5)}: <strong>{formatCurrency(p.revenue)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-text-muted font-mono">
                  <span>{revenueDays[0]?.date.slice(5)}</span>
                  <span>{revenueDays[revenueDays.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Recent Submissions Log */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-1 h-3.5 bg-emerald-500 rounded-full" />
              <h2 className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted">Recent Submissions Log</h2>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-bold text-sm mb-4 sm:mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Recent Submissions</h3>
              {recentSubs.length === 0 ? (
                <p className="text-text-muted text-sm">No submissions yet</p>
              ) : (
                <>
                  {/* Mobile: Card Layout */}
                  <div className="space-y-3 md:hidden">
                    {recentSubs.map((s) => (
                      <div key={s._id} className="bg-bg-primary/40 rounded-xl p-3 border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
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
                          </div>
                          <span className="text-[10px] text-text-muted">{new Date(s.submittedAt).toLocaleDateString("id-ID")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-semibold">@{s.userName}</span>
                            <span className="text-text-muted/40 mx-1">→</span>
                            <span className="text-xs text-text-secondary">{s.campaignTitle}</span>
                          </div>
                          <span className="text-xs text-text-muted font-mono ml-2 flex-shrink-0">{formatNumber(s.views)} views</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Row Layout */}
                  <div className="space-y-1 hidden md:block">
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Campaigns (xl:col-span-1) */}
        <div className="space-y-6 sm:space-y-8">
          {/* Section: Pending Action Items */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-1 h-3.5 bg-warning rounded-full" />
              <h2 className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted">Pending Action Items</h2>
            </div>

            {/* Quick Actions (Adjusted to 2x2 grid to look excellent in sidebar) */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/submissions" className="glass-card p-3 flex flex-col gap-2 hover:border-warning/50 transition-all group">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                <div>
                  <div className="text-base font-bold text-warning">{stats?.pendingSubmissions || 0}</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-extrabold">Submissions</div>
                </div>
              </Link>
              <Link href="/admin/payouts" className="glass-card p-3 flex flex-col gap-2 hover:border-pink/50 transition-all group">
                <span className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
                <div>
                  <div className="text-base font-bold text-pink">{stats?.pendingPayouts || 0}</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-extrabold">Payouts</div>
                </div>
              </Link>
              <Link href="/admin/campaigns/new" className="glass-card p-3 flex flex-col gap-2 hover:border-accent/50 transition-all group">
                <span className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
                <div>
                  <div className="text-sm font-bold text-accent-light">Create</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-extrabold">Campaign</div>
                </div>
              </Link>
              <Link href="/admin/activity-log" className="glass-card p-3 flex flex-col gap-2 hover:border-info/50 transition-all group">
                <span className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
                <div>
                  <div className="text-sm font-bold text-info">View Log</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-extrabold">Activity</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Section: Campaign Performance */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-1 h-3.5 bg-pink rounded-full" />
              <h2 className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted">Campaign Performance</h2>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Campaign Status Breakdown */}
              <div className="glass-card p-4 sm:p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-light"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></span> Campaign Breakdown</h3>
                {breakdown.length === 0 ? (
                  <p className="text-text-muted text-sm">No campaigns yet</p>
                ) : (
                  <div className="space-y-3.5">
                    {breakdown.map((b) => {
                      const pct = b.totalBudget > 0 ? Math.round((b.budgetUsed / b.totalBudget) * 100) : 0;
                      return (
                        <div key={b._id}>
                          <div className="flex items-center justify-between mb-1.5 gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("status-dot", statusDot[b._id])} />
                              <span className={cn("text-xs font-bold capitalize", statusColor[b._id] || "text-text-primary")}>{b._id}</span>
                              <span className="text-[9px] text-text-muted bg-bg-tertiary px-1.5 py-0.2 rounded">{b.count}</span>
                            </div>
                            <span className="text-[10px] text-text-muted font-mono">{formatCurrency(b.budgetUsed)} / {formatCurrency(b.totalBudget)}</span>
                          </div>
                          <div className="progress-bar h-1.5">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Campaigns */}
              <div className="glass-card p-4 sm:p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span> Top Campaigns</h3>
                {topCampaigns.length === 0 ? (
                  <p className="text-text-muted text-sm">No active campaigns</p>
                ) : (
                  <div className="space-y-2">
                    {topCampaigns.map((c, i) => (
                      <div key={c._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-primary/30 transition-colors">
                        <span className={cn(
                          "text-sm w-6 text-center font-bold flex-shrink-0",
                          i === 0 ? "trophy-gold" : i === 1 ? "trophy-silver" : i === 2 ? "trophy-bronze" : "text-text-muted"
                        )}>
                          {i < 3 ? "🏆" : `#${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{typeEmoji[c.type] || "📋"} {c.title}</div>
                          <div className="text-[9px] text-text-muted">{c.totalCreators} creators • {c.totalSubmissions} subs</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] font-bold font-mono">{formatCurrency(c.budgetUsed)}</div>
                          <div className="text-[8px] text-text-muted">/ {formatCurrency(c.totalBudget)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
