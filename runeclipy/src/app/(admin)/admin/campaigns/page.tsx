"use client";

import { useState, useEffect } from "react";
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

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCampaigns(d.campaigns); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === "active" ? "paused" : "active";
    await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, status: newStatus } : c));
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign permanently?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c._id !== id));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">🎵</div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Manage Campaigns</h1>
          <p className="text-sm text-text-muted mt-1">{campaigns.length} campaigns total</p>
        </div>
        <Link href="/admin/campaigns/new" className="btn-gradient !rounded-xl text-sm !py-2.5 flex items-center gap-2">
          + New Campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c._id} className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{c.title}</span>
                <span className={`badge badge-${c.type} text-[10px]`}>{c.type}</span>
                <span className={`badge badge-${c.status} text-[10px]`}>{c.status}</span>
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                <span>Budget: {formatCurrency(c.totalBudget)}</span>
                <span>Used: {Math.round((c.budgetUsed / c.totalBudget) * 100)}%</span>
                <span>Creators: {c.totalCreators}</span>
                <span>Submissions: {c.totalSubmissions}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleStatus(c._id, c.status)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  c.status === "active" ? "bg-warning/20 text-warning hover:bg-warning/30" : "bg-success/20 text-success hover:bg-success/30"
                )}>
                {c.status === "active" ? "Pause" : "Activate"}
              </button>
              <Link href={`/admin/campaigns/${c._id}/edit`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition-all">
                Edit
              </Link>
              <button onClick={() => deleteCampaign(c._id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-error/20 text-error hover:bg-error/30 transition-all">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
