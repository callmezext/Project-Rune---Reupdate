"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";

interface FinanceData {
  totalPaidOut: number;
  totalFees: number;
  totalPending: number;
  totalCampaignBudgets: number;
  totalBudgetUsed: number;
  earningsPerDay: { _id: string; totalEarned: number; count: number }[];
  campaignBudgets: { _id: string; title: string; totalBudget: number; budgetUsed: number; status: string; type: string }[];
}

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
      <div className="glass-card p-6"><div className="admin-shimmer h-40 w-full" /></div>
    </div>
  );
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/finance")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const budgetRemaining = data.totalCampaignBudgets - data.totalBudgetUsed;
  const budgetPct = data.totalCampaignBudgets > 0 ? Math.round((data.totalBudgetUsed / data.totalCampaignBudgets) * 100) : 0;

  const fillDays = () => {
    const days: { date: string; earned: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = data.earningsPerDay?.find((x) => x._id === key);
      days.push({ date: key, earned: found?.totalEarned || 0, count: found?.count || 0 });
    }
    return days;
  };
  const earningDays = fillDays();
  const maxEarning = Math.max(...earningDays.map((d) => d.earned), 1);

  const typeEmoji: Record<string, string> = { music: "🎵", clipping: "🎬", logo: "🏷️", ugc: "📦" };

  const statCards = [
    { label: "Campaign Budgets", value: formatCurrency(data.totalCampaignBudgets), icon: "🏦", gradient: "from-blue-500/20 via-blue-600/10 to-transparent" },
    { label: "Budget Used", value: formatCurrency(data.totalBudgetUsed), icon: "📊", gradient: "from-purple-500/20 via-purple-600/10 to-transparent" },
    { label: "Total Paid Out", value: formatCurrency(data.totalPaidOut), icon: "💸", gradient: "from-green-500/20 via-green-600/10 to-transparent" },
    { label: "Platform Fees", value: formatCurrency(data.totalFees), icon: "💎", gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent" },
    { label: "Pending Payouts", value: formatCurrency(data.totalPending), icon: "⏳", gradient: "from-yellow-500/20 via-yellow-600/10 to-transparent" },
    { label: "Budget Remaining", value: formatCurrency(budgetRemaining), icon: "💰", gradient: "from-pink-500/20 via-pink-600/10 to-transparent" },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="admin-page-header">
        <h1>Financial Overview</h1>
        <p>Budget, earnings, and payout analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((c, i) => (
          <div key={c.label} className={`admin-stat-card admin-grid-item bg-gradient-to-br ${c.gradient}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <span className="text-2xl mb-2 block">{c.icon}</span>
            <div className="text-xl font-extrabold tracking-tight mb-0.5 font-mono">{c.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-widest font-medium">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Budget Usage Bar */}
      <div className="glass-card p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">📊 Overall Budget Usage</h3>
          <span className={cn("text-sm font-bold font-mono",
            budgetPct > 90 ? "text-error" : budgetPct > 70 ? "text-warning" : "text-success"
          )}>{budgetPct}%</span>
        </div>
        <div className="w-full h-4 bg-bg-primary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000",
              budgetPct > 90 ? "bg-error" : budgetPct > 70 ? "bg-warning" : "bg-accent"
            )}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
          <span>{formatCurrency(data.totalBudgetUsed)} used</span>
          <span>{formatCurrency(budgetRemaining)} remaining</span>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="glass-card p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-sm">💰 Daily Earnings</h3>
            <p className="text-[11px] text-text-muted">Last 30 days • Total: {formatCurrency(earningDays.reduce((a, b) => a + b.earned, 0))}</p>
          </div>
          <span className="text-xs font-mono text-success bg-success/10 px-2 py-1 rounded-lg">📈</span>
        </div>
        <div className="flex items-end gap-[2px] h-36">
          {earningDays.map((d, i) => (
            <div key={i} className="admin-chart-bar">
              <div
                className="admin-chart-bar-fill bg-success/50"
                style={{ height: `${(d.earned / maxEarning) * 100}%`, minHeight: d.earned > 0 ? "4px" : "1px" }}
              />
              <div className="admin-chart-tooltip">
                {d.date.slice(5)}: {formatCurrency(d.earned)} ({d.count} subs)
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-text-muted font-mono">
          <span>{earningDays[0]?.date.slice(5)}</span>
          <span>{earningDays[earningDays.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Campaign Budget Breakdown */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-sm mb-5">🎯 Budget per Campaign</h3>
        {(!data.campaignBudgets || data.campaignBudgets.length === 0) ? (
          <p className="text-text-muted text-sm">No campaigns</p>
        ) : (
          <div className="space-y-5">
            {data.campaignBudgets.map((c) => {
              const pct = c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;
              return (
                <div key={c._id}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{typeEmoji[c.type] || "📋"}</span>
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className={cn("status-dot", `status-dot--${c.status}`)} />
                      <span className={`badge text-[9px] badge-${c.status}`}>{c.status}</span>
                    </div>
                    <span className="text-xs text-text-muted font-mono">{formatCurrency(c.budgetUsed)} / {formatCurrency(c.totalBudget)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700",
                        pct > 90 ? "bg-error" : pct > 70 ? "bg-warning" : "bg-accent"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
