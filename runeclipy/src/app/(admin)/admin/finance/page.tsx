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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">📈</div></div>;
  if (!data) return null;

  const budgetRemaining = data.totalCampaignBudgets - data.totalBudgetUsed;
  const budgetPct = data.totalCampaignBudgets > 0 ? Math.round((data.totalBudgetUsed / data.totalCampaignBudgets) * 100) : 0;

  // Fill earnings chart
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Financial Overview</h1>
      <p className="text-sm text-text-muted mb-8">Budget, earnings, dan payout analytics</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Campaign Budgets", value: formatCurrency(data.totalCampaignBudgets), icon: "🏦", color: "from-blue-500/20 to-blue-600/5" },
          { label: "Budget Used", value: formatCurrency(data.totalBudgetUsed), icon: "📊", color: "from-purple-500/20 to-purple-600/5" },
          { label: "Total Paid Out", value: formatCurrency(data.totalPaidOut), icon: "💸", color: "from-green-500/20 to-green-600/5" },
          { label: "Platform Fees", value: formatCurrency(data.totalFees), icon: "💎", color: "from-emerald-500/20 to-emerald-600/5" },
          { label: "Pending Payouts", value: formatCurrency(data.totalPending), icon: "⏳", color: "from-yellow-500/20 to-yellow-600/5" },
          { label: "Budget Remaining", value: formatCurrency(budgetRemaining), icon: "💰", color: "from-pink-500/20 to-pink-600/5" },
        ].map((c) => (
          <div key={c.label} className={`glass-card p-5 bg-gradient-to-br ${c.color}`}>
            <span className="text-2xl mb-2 block">{c.icon}</span>
            <div className="text-xl font-extrabold mb-0.5">{c.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Budget Usage Bar */}
      <div className="glass-card p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">📊 Overall Budget Usage</h3>
          <span className="text-sm font-bold">{budgetPct}%</span>
        </div>
        <div className="w-full h-4 bg-bg-primary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700",
              budgetPct > 90 ? "bg-error" : budgetPct > 70 ? "bg-warning" : "bg-accent"
            )}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>{formatCurrency(data.totalBudgetUsed)} used</span>
          <span>{formatCurrency(budgetRemaining)} remaining</span>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-bold text-sm mb-1">💰 Earnings per Day (30 Hari)</h3>
        <p className="text-[10px] text-text-muted mb-4">Total: {formatCurrency(earningDays.reduce((a, b) => a + b.earned, 0))}</p>
        <div className="flex items-end gap-[2px] h-32">
          {earningDays.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div
                className="w-full bg-success/50 hover:bg-success rounded-t transition-all cursor-pointer"
                style={{ height: `${(d.earned / maxEarning) * 100}%`, minHeight: d.earned > 0 ? "4px" : "1px" }}
              />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary border border-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap z-10">
                {d.date.slice(5)}: {formatCurrency(d.earned)} ({d.count} subs)
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-text-muted">
          <span>{earningDays[0]?.date.slice(5)}</span>
          <span>{earningDays[earningDays.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Campaign Budget Breakdown */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-sm mb-4">🎯 Budget per Campaign</h3>
        {(!data.campaignBudgets || data.campaignBudgets.length === 0) ? (
          <p className="text-text-muted text-sm">No campaigns</p>
        ) : (
          <div className="space-y-4">
            {data.campaignBudgets.map((c) => {
              const pct = c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;
              return (
                <div key={c._id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{typeEmoji[c.type] || "📋"}</span>
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className={`badge text-[9px] badge-${c.status}`}>{c.status}</span>
                    </div>
                    <span className="text-xs text-text-muted">{formatCurrency(c.budgetUsed)} / {formatCurrency(c.totalBudget)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
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
