"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ConnectedAccountAdmin {
  _id: string;
  userId: string;
  platform: string;
  username: string;
  profileUrl: string;
  verificationCode: string;
  isVerified: boolean;
  verifiedAt?: string;
  connectedAt: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

type Toast = { message: string; type: "success" | "error" } | null;

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccountAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAccounts(d.accounts); })
      .catch((err) => {
        console.error(err);
        showToast("Failed to load accounts", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleAction = async (accountId: string, action: "verify" | "unverify" | "delete") => {
    if (action === "delete" && !confirm("Delete this connected account?")) return;

    setActionLoading(accountId);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "delete") {
          setAccounts((prev) => prev.filter((a) => a._id !== accountId));
          showToast("Account deleted");
        } else {
          setAccounts((prev) =>
            prev.map((a) =>
              a._id === accountId
                ? {
                    ...a,
                    isVerified: action === "verify",
                    verifiedAt: action === "verify" ? new Date().toISOString() : undefined,
                  }
                : a
            )
          );
          showToast(action === "verify" ? "Account verified!" : "Verification revoked");
        }
      } else {
        showToast(data.error || "Action failed", "error");
      }
    } catch {
      showToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search ||
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.name?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "all" ||
      (filter === "verified" && a.isVerified) ||
      (filter === "pending" && !a.isVerified);

    return matchSearch && matchFilter;
  });

  const pendingCount = accounts.filter((a) => !a.isVerified).length;
  const verifiedCount = accounts.filter((a) => a.isVerified).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-shimmer h-8 w-48 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4"><div className="admin-shimmer h-20 w-full" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="admin-page-header">
        <h1>Connected Accounts</h1>
        <p>{accounts.length} total • {verifiedCount} verified • {pendingCount} pending</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
          placeholder="🔍 Search by username, email, name..."
        />
        <div className="admin-filter-tabs">
          {(["all", "pending", "verified"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("admin-filter-tab", filter === f && "admin-filter-tab--active")}
            >
              {f === "pending" ? `⏳ Pending (${pendingCount})` : f === "verified" ? `✅ Verified (${verifiedCount})` : "All"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🔗</div>
          <p className="admin-empty-text">No connected accounts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((acc) => (
            <div
              key={acc._id}
              className={cn(
                "glass-card p-5 transition-all",
                !acc.isVerified && "border-l-3 border-l-warning"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {acc.platform === "tiktok" ? "🎵" : "🔗"}
                    </span>
                    <span className="font-bold text-sm">@{acc.username}</span>
                    <span className={cn("status-dot",
                      acc.isVerified ? "status-dot--active" : "status-dot--pending"
                    )} />
                    <span className={cn("badge text-[10px]",
                      acc.isVerified ? "badge-active" : "badge-paused"
                    )}>
                      {acc.isVerified ? "✅ Verified" : "⏳ Pending"}
                    </span>
                  </div>

                  {/* User info */}
                  {acc.user && (
                    <div className="text-xs text-text-muted flex items-center gap-2 mb-1.5">
                      <span>👤 {acc.user.name || "Unknown"}</span>
                      <span className="text-text-muted/30">•</span>
                      <span className="font-mono">{acc.user.email}</span>
                    </div>
                  )}

                  {/* Verification code */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Code:</span>
                    <code className="bg-bg-tertiary px-2.5 py-1 rounded-lg font-mono text-accent-light font-bold tracking-widest text-xs border border-border/50">
                      {acc.verificationCode}
                    </code>
                  </div>

                  {/* Dates */}
                  <div className="flex gap-4 mt-2 text-[10px] text-text-muted font-mono">
                    <span>Connected: {new Date(acc.connectedAt).toLocaleDateString("id-ID")}</span>
                    {acc.verifiedAt && (
                      <span className="text-success">Verified: {new Date(acc.verifiedAt).toLocaleDateString("id-ID")}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <a
                    href={acc.profileUrl || `https://tiktok.com/@${acc.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn--ghost"
                  >
                    🔗 Profile
                  </a>

                  {!acc.isVerified ? (
                    <button
                      type="button"
                      onClick={() => handleAction(acc._id, "verify")}
                      disabled={actionLoading === acc._id}
                      className="admin-btn admin-btn--success"
                    >
                      {actionLoading === acc._id ? "⏳" : "✅ Verify"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAction(acc._id, "unverify")}
                      disabled={actionLoading === acc._id}
                      className="admin-btn admin-btn--warning"
                    >
                      {actionLoading === acc._id ? "⏳" : "↩️ Unverify"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAction(acc._id, "delete")}
                    disabled={actionLoading === acc._id}
                    className="admin-btn admin-btn--danger"
                  >
                    {actionLoading === acc._id ? "⏳" : "🗑️"}
                  </button>
                </div>
              </div>
            </div>
          ))}
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
