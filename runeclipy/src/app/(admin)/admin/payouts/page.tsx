"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, cn } from "@/lib/utils";

interface Payout {
  _id: string;
  userName: string;
  userEmail: string;
  amount: number;
  paymentFee: number;
  netAmount: number;
  status: string;
  paymentMethod: { type: string; email?: string; phone?: string };
  createdAt: string;
  processedAt?: string;
}

type Toast = { message: string; type: "success" | "error" } | null;

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPayouts(d.payouts); })
      .catch((err) => {
        console.error(err);
        showToast("Failed to load payouts", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handlePayout = async (id: string, action: "completed" | "rejected") => {
    const actionLabel = action === "completed" ? "mark as paid" : "reject";
    if (!confirm(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} this payout?`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setPayouts((prev) => prev.map((p) => p._id === id ? { ...p, status: action } : p));
        showToast(action === "completed" ? "Payout marked as paid" : "Payout rejected & refunded");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to process payout", "error");
      }
    } catch {
      showToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = payouts.filter((p) => filter === "all" || p.status === filter);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const completedCount = payouts.filter((p) => p.status === "completed").length;
  const rejectedCount = payouts.filter((p) => p.status === "rejected").length;
  const pendingTotal = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-shimmer h-8 w-48 mb-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-5"><div className="admin-shimmer h-20 w-full" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="admin-page-header">
        <h1>Payouts</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p>{pendingCount} pending payouts</p>
          {pendingCount > 0 && (
            <span className="badge bg-warning/20 text-warning text-[10px]">
              💸 {formatCurrency(pendingTotal)} total pending
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs mb-6">
        {(["pending", "completed", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("admin-filter-tab capitalize", filter === f && "admin-filter-tab--active")}
          >
            {f} {f === "pending" ? `(${pendingCount})` : f === "completed" ? `(${completedCount})` : f === "rejected" ? `(${rejectedCount})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">💸</div>
          <p className="admin-empty-text">No {filter === "all" ? "" : filter} payouts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const isDisabled = actionLoading === p._id;
            return (
              <div key={p._id} className="glass-card p-5 transition-all">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm">@{p.userName}</span>
                      <span className="text-text-muted text-xs">({p.userEmail})</span>
                    </div>

                    {/* Amount breakdown */}
                    <div className="flex gap-4 text-xs mt-2">
                      <div className="bg-bg-primary/50 border border-border/30 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-text-muted mb-0.5">Amount</div>
                        <div className="font-bold font-mono">{formatCurrency(p.amount)}</div>
                      </div>
                      <div className="bg-bg-primary/50 border border-border/30 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-text-muted mb-0.5">Fee</div>
                        <div className="font-mono text-warning">{formatCurrency(p.paymentFee || 0)}</div>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-text-muted mb-0.5">Net</div>
                        <div className="font-bold font-mono text-success">{formatCurrency(p.netAmount || 0)}</div>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="text-xs text-text-muted mt-2 flex items-center gap-2">
                      <span className="badge bg-bg-tertiary text-text-secondary text-[10px] capitalize">
                        {p.paymentMethod?.type || "N/A"}
                      </span>
                      <span className="font-mono">{p.paymentMethod?.email || p.paymentMethod?.phone || "N/A"}</span>
                      <span className="text-text-muted/30">•</span>
                      <span className="font-mono">{new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePayout(p._id, "completed")}
                          disabled={isDisabled}
                          className="admin-btn admin-btn--success"
                        >
                          {isDisabled ? "⏳" : "✅ Mark Paid"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePayout(p._id, "rejected")}
                          disabled={isDisabled}
                          className="admin-btn admin-btn--danger"
                        >
                          {isDisabled ? "⏳" : "❌ Reject"}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn("status-dot",
                          p.status === "completed" ? "status-dot--active" : "status-dot--error"
                        )} />
                        <span className={`badge ${p.status === "completed" ? "badge-active" : "bg-error/20 text-error"} text-[10px]`}>
                          {p.status}
                        </span>
                      </div>
                    )}
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
