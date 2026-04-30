"use client";

import { useState, useEffect } from "react";
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

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccountAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAccounts = () => {
    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAccounts(d.accounts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAction = async (accountId: string, action: "verify" | "unverify" | "delete") => {
    if (action === "delete" && !confirm("Yakin mau hapus akun ini?")) return;

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
        }
      } else {
        alert(data.error || "Gagal");
      }
    } catch {
      alert("Request failed");
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Connected Accounts</h1>
      <p className="text-sm text-text-muted mb-6">
        {accounts.length} total • {verifiedCount} verified • {pendingCount} pending
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
          placeholder="🔍 Search by username, email, name..."
        />
        <div className="flex gap-2">
          {(["all", "pending", "verified"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                filter === f
                  ? "bg-accent/20 text-accent-light"
                  : "bg-bg-tertiary text-text-muted hover:bg-bg-tertiary/80"
              )}
            >
              {f === "pending" ? `⏳ Pending (${pendingCount})` : f === "verified" ? `✅ Verified (${verifiedCount})` : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-text-muted">No connected accounts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((acc) => (
            <div
              key={acc._id}
              className={cn(
                "glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                !acc.isVerified && "border-l-2 border-l-warning"
              )}
            >
              {/* Account Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {acc.platform === "tiktok" ? "🎵" : "🔗"}
                  </span>
                  <span className="font-bold text-sm">@{acc.username}</span>
                  <span
                    className={cn(
                      "badge text-[10px]",
                      acc.isVerified ? "badge-active" : "badge-paused"
                    )}
                  >
                    {acc.isVerified ? "✅ Verified" : "⏳ Pending"}
                  </span>
                </div>

                {/* User info */}
                {acc.user && (
                  <div className="text-xs text-text-muted flex items-center gap-2 mb-1">
                    <span>👤 {acc.user.name || "Unknown"}</span>
                    <span className="text-text-muted/50">•</span>
                    <span className="font-mono">{acc.user.email}</span>
                  </div>
                )}

                {/* Verification code */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Code:</span>
                  <code className="bg-bg-tertiary px-2 py-0.5 rounded font-mono text-accent-light font-bold tracking-widest">
                    {acc.verificationCode}
                  </code>
                </div>

                {/* Dates */}
                <div className="flex gap-4 mt-1 text-[10px] text-text-muted">
                  <span>Connected: {new Date(acc.connectedAt).toLocaleDateString("id-ID")}</span>
                  {acc.verifiedAt && (
                    <span>Verified: {new Date(acc.verifiedAt).toLocaleDateString("id-ID")}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <a
                  href={acc.profileUrl || `https://tiktok.com/@${acc.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 transition-all"
                >
                  🔗 Open Profile
                </a>

                {!acc.isVerified ? (
                  <button
                    onClick={() => handleAction(acc._id, "verify")}
                    disabled={actionLoading === acc._id}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition-all disabled:opacity-50"
                  >
                    {actionLoading === acc._id ? "..." : "✅ Manual Verify"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(acc._id, "unverify")}
                    disabled={actionLoading === acc._id}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-warning/20 text-warning hover:bg-warning/30 transition-all disabled:opacity-50"
                  >
                    {actionLoading === acc._id ? "..." : "↩️ Unverify"}
                  </button>
                )}

                <button
                  onClick={() => handleAction(acc._id, "delete")}
                  disabled={actionLoading === acc._id}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-error/20 text-error hover:bg-error/30 transition-all disabled:opacity-50"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
