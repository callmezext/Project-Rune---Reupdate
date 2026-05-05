"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface SubReview {
  _id: string;
  videoUrl: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  earned: number;
  status: string;
  rejectReason: string;
  submittedAt: string;
  userName: string;
  campaignTitle: string;
  suspicious: boolean;
  engagementRate: string;
}

type Toast = { message: string; type: "success" | "error" } | null;

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/admin/submissions")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSubmissions(d.submissions); })
      .catch((err) => {
        console.error(err);
        showToast("Failed to load submissions", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleReview = async (id: string, action: "approved" | "rejected", reason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, rejectReason: reason || "" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissions((prev) => prev.map((s) => s._id === id ? { ...s, status: action } : s));
        showToast(`Submission ${action} successfully`);
      } else {
        showToast(data.error || "Review failed", "error");
      }
    } catch {
      showToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    const pending = submissions.filter((s) => s.status === "pending" && !s.suspicious);
    if (pending.length === 0) {
      showToast("No non-suspicious pending submissions", "error");
      return;
    }
    if (!confirm(`Approve ${pending.length} submissions at once? (Non-suspicious only)`)) return;

    let approved = 0;
    for (const sub of pending) {
      try {
        const res = await fetch(`/api/submissions/${sub._id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved", rejectReason: "" }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSubmissions((prev) => prev.map((s) => s._id === sub._id ? { ...s, status: "approved" } : s));
          approved++;
        }
      } catch { /* continue */ }
    }
    showToast(`${approved} submissions approved successfully`);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = filtered.filter((s) => s.status === "pending").map((s) => s._id);
    if (pendingIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const handleBulkAction = async (action: "approved" | "rejected") => {
    if (selected.size === 0) return;
    const reason = action === "rejected" ? prompt("Reject reason for all:") : null;
    if (action === "rejected" && reason === null) return;
    if (!confirm(`${action === "approved" ? "Approve" : "Reject"} ${selected.size} submissions?`)) return;

    setActionLoading("bulk");
    let count = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/api/submissions/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action, rejectReason: reason || "" }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSubmissions((prev) => prev.map((s) => s._id === id ? { ...s, status: action } : s));
          count++;
        }
      } catch { /* continue */ }
    }
    setSelected(new Set());
    setActionLoading(null);
    showToast(`${count} submissions ${action} successfully`);
  };

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;
  const suspiciousCount = submissions.filter((s) => s.suspicious && s.status === "pending").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-shimmer h-8 w-48 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5"><div className="admin-shimmer h-24 w-full" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="admin-page-header !mb-0">
          <h1>Submissions</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filter === "pending" && pendingCount > 0 && (
            <button onClick={toggleSelectAll} className="admin-btn admin-btn--ghost text-xs">
              {filtered.filter((s) => s.status === "pending").every((s) => selected.has(s._id)) && selected.size > 0
                ? "☑️ Deselect All" : `☐ Select All (${filtered.filter((s) => s.status === "pending").length})`}
            </button>
          )}
          {pendingCount > 0 && pendingCount - suspiciousCount > 0 && (
            <button onClick={handleApproveAll} className="admin-btn admin-btn--success">
              ✅ Approve All Clean ({pendingCount - suspiciousCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <p className="text-sm text-text-muted">{pendingCount} pending review</p>
        {suspiciousCount > 0 && (
          <span className="badge bg-warning/20 text-warning text-[10px]">⚠️ {suspiciousCount} suspicious</span>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="glass-card p-3 mb-4 flex flex-wrap items-center gap-3 !border-accent/40 animate-fadeInUp">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <button onClick={() => handleBulkAction("approved")} disabled={actionLoading === "bulk"}
            className="admin-btn admin-btn--success">
            {actionLoading === "bulk" ? "⏳ Processing..." : `✅ Approve (${selected.size})`}
          </button>
          <button onClick={() => handleBulkAction("rejected")} disabled={actionLoading === "bulk"}
            className="admin-btn admin-btn--danger">
            {actionLoading === "bulk" ? "⏳" : `❌ Reject (${selected.size})`}
          </button>
          <button onClick={() => setSelected(new Set())} className="admin-btn admin-btn--ghost text-xs">
            Clear selection
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="admin-filter-tabs mb-6">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("admin-filter-tab capitalize", filter === f && "admin-filter-tab--active")}
          >
            {f} {f === "pending" ? `(${pendingCount})` : f === "approved" ? `(${approvedCount})` : f === "rejected" ? `(${rejectedCount})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🎬</div>
          <p className="admin-empty-text">
            {filter === "all" ? "No submissions yet" : `No ${filter} submissions`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const isDisabled = actionLoading === sub._id;
            const engRate = parseFloat(sub.engagementRate || "0");

            return (
              <div key={sub._id} className={cn(
                "glass-card p-4 sm:p-5 transition-all",
                sub.suspicious && sub.status === "pending" && "!border-warning/40 ring-1 ring-warning/20",
                selected.has(sub._id) && "!border-accent/50 ring-1 ring-accent/30 bg-accent/5"
              )}>
                <div className="flex items-start gap-3">
                  {sub.status === "pending" && (
                    <input type="checkbox" checked={selected.has(sub._id)}
                      onChange={() => toggleSelect(sub._id)}
                      className="mt-1 accent-accent w-4 h-4 flex-shrink-0 cursor-pointer" />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Suspicious banner */}
                    {sub.suspicious && sub.status === "pending" && (
                      <div className="mb-3 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-medium flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{sub.rejectReason?.replace("⚠️ SUSPICIOUS: ", "")}</span>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Campaign + User */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-lg">{sub.campaignTitle}</span>
                        </div>
                        <div className="font-bold text-sm mb-1.5">@{sub.userName}</div>
                        <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-accent-light hover:text-accent hover:underline break-all transition-colors">
                          {sub.videoUrl}
                        </a>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[
                            { icon: "👁️", val: formatNumber(sub.views || 0), label: "views" },
                            { icon: "❤️", val: formatNumber(sub.likes || 0), label: "likes" },
                            { icon: "💬", val: formatNumber(sub.comments || 0), label: "comments" },
                            { icon: "🔄", val: formatNumber(sub.shares || 0), label: "shares" },
                          ].map((s) => (
                            <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-primary/50 border border-border/30 text-xs">
                              <span>{s.icon}</span>
                              <span className="font-semibold">{s.val}</span>
                            </div>
                          ))}
                          <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border",
                            engRate < 1 ? "bg-error/10 text-error border-error/20" :
                            engRate < 3 ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-success/10 text-success border-success/20"
                          )}>
                            <span>📊</span>
                            <span>{sub.engagementRate || "0"}%</span>
                          </div>
                        </div>

                        {sub.earned > 0 && (
                          <div className="mt-2 text-xs text-success font-semibold">💰 Earned: {formatCurrency(sub.earned)}</div>
                        )}

                        {sub.status === "rejected" && sub.rejectReason && !sub.suspicious && (
                          <div className="mt-2 text-xs text-error bg-error/5 px-2.5 py-1.5 rounded-lg border border-error/10">
                            Reason: {sub.rejectReason}
                          </div>
                        )}

                        <div className="mt-2 text-[10px] text-text-muted font-mono">{new Date(sub.submittedAt).toLocaleString("id-ID")}</div>
                      </div>

                      <div className="flex items-start gap-2 shrink-0">
                        {sub.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReview(sub._id, "approved")}
                              disabled={isDisabled}
                              className="admin-btn admin-btn--success"
                            >
                              {isDisabled ? "⏳" : "✅ Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt("Reject reason:");
                                if (reason !== null) handleReview(sub._id, "rejected", reason);
                              }}
                              disabled={isDisabled}
                              className="admin-btn admin-btn--danger"
                            >
                              {isDisabled ? "⏳" : "❌ Reject"}
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={cn("status-dot",
                              sub.status === "approved" ? "status-dot--active" : "status-dot--error"
                            )} />
                            <span className={`badge ${sub.status === "approved" ? "badge-active" : "bg-error/20 text-error"} text-[10px]`}>
                              {sub.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
