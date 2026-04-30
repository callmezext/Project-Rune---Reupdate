"use client";

import { useState, useEffect } from "react";
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
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPayouts(d.payouts); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePayout = async (id: string, action: "completed" | "rejected") => {
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) setPayouts((prev) => prev.map((p) => p._id === id ? { ...p, status: action } : p));
  };

  const filtered = payouts.filter((p) => filter === "all" || p.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Manage Payouts</h1>
      <p className="text-sm text-text-muted mb-6">{payouts.filter((p) => p.status === "pending").length} pending payouts</p>

      <div className="flex gap-2 mb-6">
        {["pending", "completed", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all",
              filter === f ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:bg-bg-tertiary border border-transparent"
            )}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-20 text-text-muted">Loading...</div> : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p._id} className="glass-card p-5 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="font-bold text-sm">{p.userName} <span className="text-text-muted font-normal">({p.userEmail})</span></div>
                <div className="flex gap-4 text-xs text-text-muted mt-1">
                  <span>Amount: {formatCurrency(p.amount)}</span>
                  <span>Fee: {formatCurrency(p.paymentFee)}</span>
                  <span className="text-success font-bold">Net: {formatCurrency(p.netAmount)}</span>
                </div>
                <div className="text-xs text-text-muted mt-1 capitalize">
                  {p.paymentMethod?.type}: {p.paymentMethod?.email || p.paymentMethod?.phone || "N/A"} • {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.status === "pending" ? (
                  <>
                    <button onClick={() => handlePayout(p._id, "completed")}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-success/20 text-success hover:bg-success/30">
                      ✅ Mark Paid
                    </button>
                    <button onClick={() => handlePayout(p._id, "rejected")}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-error/20 text-error hover:bg-error/30">
                      ❌ Reject
                    </button>
                  </>
                ) : (
                  <span className={`badge text-[10px] ${p.status === "completed" ? "badge-active" : "bg-error/20 text-error"}`}>{p.status}</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-text-muted">No {filter} payouts</div>}
        </div>
      )}
    </div>
  );
}
