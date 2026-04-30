"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface AdminUser {
  _id: string;
  nickname: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  campaignBalance: number;
  referralBalance: number;
  stats: { totalVideos: number; totalEarned: number };
  memberSince: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.users); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleBan = async (userId: string, isBanned: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned: !isBanned }),
    });
    if (res.ok) setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: !isBanned } : u));
  };

  const toggleRole = async (userId: string, role: string) => {
    const newRole = role === "admin" ? "user" : "admin";
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
  };

  const filtered = users.filter((u) =>
    !search || u.username.includes(search.toLowerCase()) || u.email.includes(search.toLowerCase()) || u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Manage Users</h1>
      <p className="text-sm text-text-muted mb-6">{users.length} total users</p>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        className="input-field mb-6 max-w-md" placeholder="🔍 Search by username, email..." />

      {loading ? (
        <div className="text-center py-20 text-text-muted">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="pb-3 text-left">User</th>
                <th className="pb-3 text-left">Email</th>
                <th className="pb-3 text-center">Role</th>
                <th className="pb-3 text-center">Videos</th>
                <th className="pb-3 text-right">Earned</th>
                <th className="pb-3 text-right">Balance</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className={cn("border-b border-border/50 hover:bg-bg-primary/30 transition-colors", u.isBanned && "opacity-50")}>
                  <td className="py-3">
                    <div className="font-bold">{u.nickname}</div>
                    <div className="text-xs text-text-muted font-mono">@{u.username}</div>
                  </td>
                  <td className="py-3 text-text-muted text-xs">{u.email}</td>
                  <td className="py-3 text-center">
                    <span className={`badge text-[10px] ${u.role === "admin" ? "bg-error/20 text-error" : "badge-active"}`}>{u.role}</span>
                  </td>
                  <td className="py-3 text-center">{u.stats.totalVideos}</td>
                  <td className="py-3 text-right text-success font-medium">{formatCurrency(u.stats.totalEarned)}</td>
                  <td className="py-3 text-right">{formatCurrency(u.campaignBalance + u.referralBalance)}</td>
                  <td className="py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => toggleRole(u._id, u.role)}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-accent/20 text-accent-light hover:bg-accent/30">
                        {u.role === "admin" ? "→ User" : "→ Admin"}
                      </button>
                      <button onClick={() => toggleBan(u._id, u.isBanned)}
                        className={cn("px-2 py-1 rounded text-[10px] font-medium",
                          u.isBanned ? "bg-success/20 text-success" : "bg-error/20 text-error"
                        )}>
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
