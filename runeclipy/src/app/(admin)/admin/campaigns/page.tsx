"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";

interface Campaign {
  _id: string;
  title: string;
  type: string;
  status: string;
  totalBudget: number;
  budgetUsed: number;
  totalCreators: number;
  totalSubmissions: number;
  createdAt: string;
}

type Toast = { message: string; type: "success" | "error" } | null;

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
        return;
      }
      // Fallback
      const res2 = await fetch("/api/campaigns");
      const data2 = await res2.json();
      if (data2.success && data2.campaigns) setCampaigns(data2.campaigns);
    } catch (err) {
      console.error("Fetch campaigns error:", err);
      showToast("Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === "active" ? "paused" : "active";
    if (!confirm(`Change campaign status to "${newStatus}"?`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, status: newStatus } : c));
        showToast(`Campaign ${newStatus === "active" ? "activated" : "paused"} successfully`);
      } else {
        showToast(data.error || "Failed to change status", "error");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      showToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign permanently? This action cannot be undone.")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns((prev) => prev.filter((c) => c._id !== id));
        showToast("Campaign deleted successfully");
      } else {
        showToast(data.error || "Failed to delete campaign", "error");
      }
    } catch (err) {
      console.error("Delete campaign error:", err);
      showToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = campaigns.filter((c) => filter === "all" || c.status === filter);
  const statusCounts = {
    all: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    ended: campaigns.filter((c) => c.status === "ended").length,
  };

  const typeEmoji: Record<string, string> = { music: "🎵", clipping: "🎬", logo: "🏷️", ugc: "📦" };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-shimmer h-8 w-48 mb-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-5"><div className="admin-shimmer h-16 w-full" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="admin-page-header !mb-0">
          <h1>Campaigns</h1>
          <p>{campaigns.length} campaigns total</p>
        </div>
        <Link href="/admin/campaigns/new" className="btn-gradient !rounded-xl text-sm !py-2.5 flex items-center gap-2">
          <span>+</span> New Campaign
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs mb-6">
        {(["all", "active", "paused", "ended"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("admin-filter-tab capitalize", filter === f && "admin-filter-tab--active")}
          >
            {f} ({statusCounts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🎵</div>
          <p className="admin-empty-text">
            {filter === "all" ? "No campaigns yet. Create your first one!" : `No ${filter} campaigns`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const budgetPct = c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;
            const isDisabled = actionLoading === c._id;

            return (
              <div key={c._id} className="glass-card p-5 hover:border-border-hover transition-all">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg">{typeEmoji[c.type] || "📋"}</span>
                      <span className="font-bold truncate">{c.title}</span>
                      <span className={cn("status-dot", `status-dot--${c.status}`)} />
                      <span className={`badge badge-${c.status} text-[10px]`}>{c.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span>💰 {formatCurrency(c.totalBudget)}</span>
                      <span>📊 {budgetPct}% used</span>
                      <span>👥 {c.totalCreators || 0} creators</span>
                      <span>🎬 {c.totalSubmissions || 0} subs</span>
                    </div>
                    {/* Budget progress bar */}
                    <div className="mt-2 w-full max-w-xs">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${budgetPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.status !== "ended" && (
                      <button
                        type="button"
                        onClick={() => toggleStatus(c._id, c.status)}
                        disabled={isDisabled}
                        className={cn("admin-btn",
                          c.status === "active" ? "admin-btn--warning" : "admin-btn--success"
                        )}
                      >
                        {isDisabled ? "⏳" : c.status === "active" ? "⏸ Pause" : "▶ Activate"}
                      </button>
                    )}
                    <Link
                      href={`/admin/campaigns/${c._id}/edit`}
                      className="admin-btn admin-btn--accent"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteCampaign(c._id)}
                      disabled={isDisabled}
                      className="admin-btn admin-btn--danger"
                    >
                      {isDisabled ? "⏳" : "🗑️"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn("admin-toast", toast.type === "success" ? "admin-toast--success" : "admin-toast--error")}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
