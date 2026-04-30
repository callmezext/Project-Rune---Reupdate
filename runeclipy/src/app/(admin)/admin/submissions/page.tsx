"use client";

import { useState, useEffect } from "react";
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

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetch("/api/admin/submissions")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSubmissions(d.submissions); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReview = async (id: string, action: "approved" | "rejected", reason?: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, rejectReason: reason || "" }),
      });
      if (res.ok) {
        setSubmissions((prev) => prev.map((s) => s._id === id ? { ...s, status: action } : s));
      }
    } catch (err) { console.error(err); }
  };

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const suspiciousCount = submissions.filter((s) => s.suspicious && s.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Review Submissions</h1>
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-text-muted">{pendingCount} pending review</p>
        {suspiciousCount > 0 && (
          <span className="badge bg-warning/20 text-warning text-[10px]">⚠️ {suspiciousCount} suspicious</span>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all",
              filter === f ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:bg-bg-tertiary border border-transparent"
            )}>
            {f} {f === "pending" ? `(${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-text-muted">No submissions</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub._id} className={cn(
              "glass-card p-5",
              sub.suspicious && sub.status === "pending" && "!border-warning/40 ring-1 ring-warning/20"
            )}>
              {/* Suspicious banner */}
              {sub.suspicious && sub.status === "pending" && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
                  ⚠️ {sub.rejectReason?.replace("⚠️ SUSPICIOUS: ", "")}
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs text-text-muted mb-1">{sub.campaignTitle}</div>
                  <div className="font-bold text-sm mb-1">@{sub.userName}</div>
                  <a href={sub.videoUrl} target="_blank" className="text-xs text-accent-light hover:underline break-all">{sub.videoUrl}</a>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary/50 text-xs">
                      <span>👁️</span>
                      <span className="font-medium">{formatNumber(sub.views)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary/50 text-xs">
                      <span>❤️</span>
                      <span className="font-medium">{formatNumber(sub.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary/50 text-xs">
                      <span>💬</span>
                      <span className="font-medium">{formatNumber(sub.comments)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary/50 text-xs">
                      <span>🔄</span>
                      <span className="font-medium">{formatNumber(sub.shares)}</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                      parseFloat(sub.engagementRate) < 1 ? "bg-error/10 text-error" :
                      parseFloat(sub.engagementRate) < 3 ? "bg-warning/10 text-warning" :
                      "bg-success/10 text-success"
                    )}>
                      <span>📊</span>
                      <span>{sub.engagementRate}% engagement</span>
                    </div>
                  </div>

                  {sub.earned > 0 && (
                    <div className="mt-2 text-xs text-success font-medium">💰 Earned: {formatCurrency(sub.earned)}</div>
                  )}

                  <div className="mt-2 text-[10px] text-text-muted">{new Date(sub.submittedAt).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {sub.status === "pending" ? (
                    <>
                      <button onClick={() => handleReview(sub._id, "approved")}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-success/20 text-success hover:bg-success/30 transition-all">
                        ✅ Approve
                      </button>
                      <button onClick={() => {
                        const reason = prompt("Reject reason:");
                        if (reason !== null) handleReview(sub._id, "rejected", reason);
                      }}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-error/20 text-error hover:bg-error/30 transition-all">
                        ❌ Reject
                      </button>
                    </>
                  ) : (
                    <span className={`badge ${sub.status === "approved" ? "badge-active" : "bg-error/20 text-error"} text-[10px]`}>{sub.status}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
